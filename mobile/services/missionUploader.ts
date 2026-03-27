/**
 * Mission Uploader Service
 * Handles the MAVLink mission upload protocol (mission protocol v2)
 *
 * Upload sequence:
 * 1. Send MISSION_CLEAR_ALL to clear existing mission
 * 2. Send MISSION_COUNT with total number of items
 * 3. Wait for MISSION_REQUEST_INT for each item
 * 4. Send MISSION_ITEM_INT in response to each request
 * 5. Wait for MISSION_ACK to confirm upload complete
 */

import { MissionItemInt, MavMsgId, MavMissionResult, MissionUploadState, MissionUploadProgress } from '../types';
import { TARGET, TIMEOUT, MAX_RETRIES, MavMissionType } from '../utils/mavlinkConstants';

/**
 * Interface for the MAVLink sender (to be implemented by MavlinkService)
 */
export interface MavlinkSender {
  sendMissionClearAll(): Promise<void>;
  sendMissionCount(count: number, missionType?: number): Promise<void>;
  sendMissionItemInt(item: MissionItemInt): Promise<void>;
}

/**
 * Interface for the MAVLink receiver (to be implemented by MavlinkService)
 */
export interface MavlinkReceiver {
  waitForMessage(
    msgId: MavMsgId,
    timeoutMs: number,
    predicate?: (msg: any) => boolean
  ): Promise<any | null>;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: MissionUploadProgress) => void;

/**
 * Result of a mission upload attempt
 */
export interface MissionUploadResult {
  success: boolean;
  error?: string;
  resultCode?: MavMissionResult;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Uploads a mission to the machine using the MAVLink mission protocol.
 *
 * @param items - Array of mission items to upload
 * @param sender - MAVLink message sender interface
 * @param receiver - MAVLink message receiver interface
 * @param onProgress - Optional callback for progress updates
 * @returns Upload result with success flag and optional error
 */
export async function uploadMission(
  items: MissionItemInt[],
  sender: MavlinkSender,
  receiver: MavlinkReceiver,
  onProgress?: ProgressCallback
): Promise<MissionUploadResult> {
  const updateProgress = (state: MissionUploadState, currentItem: number = 0, error?: string) => {
    onProgress?.({
      state,
      currentItem,
      totalItems: items.length,
      error,
    });
  };

  try {
    // Validate input
    if (items.length === 0) {
      updateProgress(MissionUploadState.ERROR, 0, 'No mission items to upload');
      return { success: false, error: 'No mission items to upload' };
    }

    // Step 1: Clear existing mission
    console.log('[MissionUploader] Clearing existing mission...');
    await sender.sendMissionClearAll();
    await sleep(500); // Give autopilot time to clear

    // Step 2: Send mission count
    updateProgress(MissionUploadState.SENDING_COUNT);
    console.log(`[MissionUploader] Sending mission count: ${items.length}`);
    await sender.sendMissionCount(items.length, MavMissionType.MISSION);

    // Step 3: Wait for requests and send items
    updateProgress(MissionUploadState.WAITING_REQUEST);
    let uploadedCount = 0;
    let retryCount = 0;

    while (uploadedCount < items.length && retryCount < MAX_RETRIES.MISSION_ITEM * items.length) {
      // Wait for MISSION_REQUEST_INT
      const request = await receiver.waitForMessage(
        MavMsgId.MISSION_REQUEST_INT,
        TIMEOUT.MISSION_REQUEST
      );

      if (!request) {
        console.log('[MissionUploader] Timeout waiting for MISSION_REQUEST_INT');
        retryCount++;

        // Check if we got a MISSION_ACK instead (could be an error)
        const ack = await receiver.waitForMessage(MavMsgId.MISSION_ACK, 100);
        if (ack) {
          const resultCode = ack.type as MavMissionResult;
          if (resultCode !== MavMissionResult.ACCEPTED) {
            const error = getMissionResultMessage(resultCode);
            updateProgress(MissionUploadState.ERROR, uploadedCount, error);
            return { success: false, error, resultCode };
          }
          break; // Upload complete
        }

        continue;
      }

      const requestedSeq = request.seq as number;
      console.log(`[MissionUploader] Received request for item ${requestedSeq}`);

      // Validate requested sequence
      if (requestedSeq >= items.length) {
        const error = `Invalid sequence requested: ${requestedSeq}`;
        updateProgress(MissionUploadState.ERROR, uploadedCount, error);
        return { success: false, error };
      }

      // Send the requested item
      updateProgress(MissionUploadState.SENDING_ITEMS, requestedSeq);
      await sender.sendMissionItemInt(items[requestedSeq]);
      console.log(`[MissionUploader] Sent item ${requestedSeq}`);

      uploadedCount = requestedSeq + 1;
      retryCount = 0; // Reset retry count on successful send
    }

    // Step 4: Wait for MISSION_ACK
    updateProgress(MissionUploadState.WAITING_ACK, items.length);
    console.log('[MissionUploader] Waiting for MISSION_ACK...');

    const ack = await receiver.waitForMessage(MavMsgId.MISSION_ACK, TIMEOUT.MISSION_ACK);

    if (!ack) {
      const error = 'Timeout waiting for mission acknowledgment';
      updateProgress(MissionUploadState.ERROR, items.length, error);
      return { success: false, error };
    }

    const resultCode = ack.type as MavMissionResult;

    if (resultCode === MavMissionResult.ACCEPTED) {
      updateProgress(MissionUploadState.COMPLETE, items.length);
      console.log('[MissionUploader] Mission upload complete!');
      return { success: true, resultCode };
    } else {
      const error = getMissionResultMessage(resultCode);
      updateProgress(MissionUploadState.ERROR, items.length, error);
      return { success: false, error, resultCode };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error during upload';
    updateProgress(MissionUploadState.ERROR, 0, error);
    return { success: false, error };
  }
}

/**
 * Converts a MAV_MISSION_RESULT code to a human-readable message
 */
function getMissionResultMessage(result: MavMissionResult): string {
  switch (result) {
    case MavMissionResult.ACCEPTED:
      return 'Mission accepted';
    case MavMissionResult.ERROR:
      return 'Mission error - generic error';
    case MavMissionResult.UNSUPPORTED_FRAME:
      return 'Coordinate frame not supported';
    case MavMissionResult.UNSUPPORTED:
      return 'Command not supported';
    case MavMissionResult.NO_SPACE:
      return 'No space for mission on vehicle';
    case MavMissionResult.INVALID:
      return 'One of the mission items is invalid';
    case MavMissionResult.INVALID_PARAM1:
      return 'Invalid parameter 1';
    case MavMissionResult.INVALID_PARAM2:
      return 'Invalid parameter 2';
    case MavMissionResult.INVALID_PARAM3:
      return 'Invalid parameter 3';
    case MavMissionResult.INVALID_PARAM4:
      return 'Invalid parameter 4';
    case MavMissionResult.INVALID_PARAM5_X:
      return 'Invalid latitude';
    case MavMissionResult.INVALID_PARAM6_Y:
      return 'Invalid longitude';
    case MavMissionResult.INVALID_PARAM7:
      return 'Invalid altitude';
    case MavMissionResult.INVALID_SEQUENCE:
      return 'Invalid sequence number';
    case MavMissionResult.DENIED:
      return 'Mission upload denied';
    case MavMissionResult.OPERATION_CANCELLED:
      return 'Upload cancelled';
    default:
      return `Unknown result code: ${result}`;
  }
}

/**
 * Downloads the current mission from the machine.
 * (For future implementation - read back mission to verify)
 */
export async function downloadMission(
  sender: MavlinkSender,
  receiver: MavlinkReceiver
): Promise<MissionItemInt[]> {
  // TODO: Implement mission download
  // 1. Send MISSION_REQUEST_LIST
  // 2. Wait for MISSION_COUNT
  // 3. For each item, send MISSION_REQUEST_INT and wait for MISSION_ITEM_INT
  // 4. Send MISSION_ACK when complete
  throw new Error('Mission download not yet implemented');
}

/**
 * Clears the mission on the machine.
 */
export async function clearMission(sender: MavlinkSender): Promise<void> {
  await sender.sendMissionClearAll();
}

/**
 * Sets the current mission item (starts mission from a specific waypoint)
 */
export async function setCurrentMissionItem(
  seq: number,
  sender: MavlinkSender
): Promise<void> {
  // TODO: Implement MISSION_SET_CURRENT
  throw new Error('Set current mission item not yet implemented');
}
