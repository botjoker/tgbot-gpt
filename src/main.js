import { Telegraf, session } from "telegraf"
import { message } from "telegraf/filters"
import { code } from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js';
import { openai } from "./openai.js";
const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

const INITIAL_SESSION = {
	messages: [],
}

bot.use(session())

bot.command('new', async(ctx) => {
	ctx.session = INITIAL_SESSION
	await ctx.reply("Waiting you message...")
})

bot.command('start', async(ctx) => {
	ctx.session = INITIAL_SESSION
	await ctx.reply("Waiting you message...")
})


bot.on(message('voice'), async (ctx) => {
	ctx.session ??= INITIAL_SESSION
	try {
		await ctx.reply(code('Waiting'))
		const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
		const oggPath = await ogg.create(link.href, ctx.message.from.id)
		const mp3Path = await ogg.toMp3(oggPath, ctx.message.from.id)

		const text = await openai.transcription(mp3Path)
		await ctx.reply(code(`Your request: ${text}`))
		
		ctx.session.messages.push({ role: 'user', content: text })
		const response = await openai.chat(ctx.session.messages)
		ctx.session.messages.push({ role: 'assistant', content: response.content })
		await ctx.reply(response.content)
	} catch (e) {
		console.log('err', e.message)
	}
	
})

bot.on(message('text'), async (ctx) => {
	ctx.session ??= INITIAL_SESSION
	try {
		ctx.session.messages.push({ role: 'user', content: ctx.message.text })
		const response = await openai.chat(ctx.session.messages)
		ctx.session.messages.push({ role: 'assistant', content: response.content })
		await ctx.reply(response.content)
	} catch (e) {
		console.log('err', e.message)
	}
	
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))