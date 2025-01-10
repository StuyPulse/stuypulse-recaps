import { WebClient } from "@slack/web-api"
import { getGPTResponse, generatePromptFromMessage } from "./openai"

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

type Event = {
    channel: string
    text: string
    ts: string
}

export async function sendGPTResponse(event: Event) {
    const { channel, text, ts } = event

    try {
        const prompts = await generatePromptFromMessage(text)

        const gptResponse = await getGPTResponse(prompts)

        await slack.chat.postMessage({
            channel,
            text: gptResponse.choices[0].message.content || `<@${process.env.SLACK_ADMIN_ID}> Error: Response from ChatGPT was empty.`,
            thread_ts: ts
        })
    } catch (error) {
        if (error instanceof Error) {
            await slack.chat.postMessage({
                channel,
                text: `<@${process.env.SLACK_ADMIN_ID}> Error: ${error.message}`,
                thread_ts: ts
            })
        }
    }
}