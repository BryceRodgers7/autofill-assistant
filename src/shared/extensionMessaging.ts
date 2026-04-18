import type { MessageFromExtension, MessageResponse } from './messages'

export async function sendExtensionMessage(
  msg: MessageFromExtension,
): Promise<MessageResponse> {
  return chrome.runtime.sendMessage(msg) as Promise<MessageResponse>
}
