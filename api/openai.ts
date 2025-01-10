import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { get } from "@vercel/edge-config"

const openai = new OpenAI()

export async function getGPTResponse(messages: ChatCompletionMessageParam[]) {
    return await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages,
    })
}

export async function generatePromptFromMessage(message: string) {
    const customPrompt = await get("prompt")
    return [
        {
            role: "user",
            content: `${customPrompt}${message.replace(`<@${process.env.SLACK_BOT_ID}>`, "")}`,
        },
    ] as ChatCompletionMessageParam[]
}