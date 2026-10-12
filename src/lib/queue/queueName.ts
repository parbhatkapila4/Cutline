export function getVideoQueueName(): string {
  return process.env.VIDEO_QUEUE_NAME || "video-generation";
}
