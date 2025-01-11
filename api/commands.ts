import { WebClient } from "@slack/web-api"
import { get } from "@vercel/edge-config"

export const config = {
    maxDuration: 30,
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

export async function POST(request: Request) {
    const formData = await request.formData()

    const commandName = formData.get("command")?.toString()
    const text = formData.get("text")?.toString().trim()
    console.log(`Command: ${commandName}`)
    console.log(`Argument: ${text}`)

    const user = formData.get("user_id")?.toString()
    const channel = formData.get("channel_id")?.toString() || ""

    if (channel != process.env.SLACK_COMMANDS_CHANNEL_ID && user != process.env.SLACK_ADMIN_ID)
        return new Response(`You can only use commands in <@${channel}>.`)

    switch (commandName) {
        case "/changeprompt":
            if (!text || text.length < 50)
                return new Response("Please provide a prompt with at least 50 characters.")

            await changePrompt(text)
        
            await slack.chat.postMessage({
                channel,
                text: `<@${user}> has changed the prompt to:\n${text}`,
            })
            break
        case "/getprompt":
            const currentPrompt = await get("prompt")
            await slack.chat.postMessage({
                channel,
                text: `The current prompt is:\n${currentPrompt}`,
            })
            break
        case "/recap":
            const dates = text?.length == 0 ? [] : text?.split(" ")
            console.log(`input: ${text}, parsed dates: ${dates}`)
            dates?.forEach(date => {
                if (!/^\d{2}-\d{2}-\d{2}$/.test(date))
                    return new Response(`Please provide all dates in the format MM-DD-YY. Problematic parameter: ${date}`)
            })
            
            const recapChannels = process.env.SLACK_RECAP_CHANNELS?.split(" ")

            if (!recapChannels)
                return new Response(`Recap channels not found. Please contact <@${process.env.SLACK_ADMIN_ID}>.`)

            const messages = await fetchMessages(recapChannels, dates!)

            if (messages.length == 0) {
                await slack.chat.postMessage({
                    channel,
                    text: "No messages found :(",
                })
            } else {
                await slack.chat.postMessage({
                    channel,
                    text: messages.join("\n")
                })
            }
    }
}

async function changePrompt(prompt: string) {
    try {
        const updateEdgeConfig = await fetch(
            `https://api.vercel.com/v1/edge-config/${process.env.VERCEL_EDGE_CONFIG_ID}/items`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    items: [
                        {
                            operation: "update",
                            key: "prompt",
                            value: prompt,
                        },
                    ],
                }),
            },
        )
        const response = await updateEdgeConfig.json()
        console.log(response)

    } catch (error) {
        console.log(error)
    }
}

async function fetchMessages(recapChannels: string[], dates: string[]) {
    const messages: string[] = []

    let oldest, latest
    switch (dates.length) {
        case 0:
            // get today's messages
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            oldest = String(Math.floor(today.getTime() / 1000))
            const tmr = new Date(today)
            tmr.setDate(today.getDate() + 1)
            latest = String(Math.floor(tmr.getTime() / 1000))
        case 1:
            // get that day's messages
            const day = new Date(dates[0])
            oldest = String(Math.floor(day.getTime() / 1000))
            const next = new Date(day)
            next.setDate(day.getDate() + 1)
            latest = String(Math.floor(next.getTime() / 1000))
        default:
            // range
            const begin = new Date(dates[0])
            oldest = String(Math.floor(begin.getTime() / 1000))
            const end = new Date(dates[1])
            latest = String(Math.floor(end.getTime() / 1000))
    }

    for (let recapChannel of recapChannels) {
        console.log(`current recap channel: ${recapChannel}`)
        const response = await slack.conversations.history({
            channel: recapChannel,
            oldest,
            latest,
        })
        
        console.log(`${recapChannel}: ${response.messages}`)

        response.messages?.forEach(message => {
            messages.push(message.text!)
        })
    }

    return messages
}