'use strict'

const SlackBot = require('./SlackBot')
const GitHubApiClient = require("./GitHubApiClient")
const PullRequests = require('./PullRequests')
const Parser = require('./Parser')
const PersonalReminder = require('./PersonalReminder')
const _ = require('lodash')

class App {
  static start() {
    this.beforeValidate()

    const bot = new SlackBot()
    const controller = bot.getController()

    controller.hears("ls (.+)", ["direct_message", "direct_mention", "mention"], this.ls)
    controller.on('spawned', this.spawned)

    bot.spawn()
  }

  static spawned(bot) {
    const reminder = new PersonalReminder(bot)
    reminder.start()
  }

  static ls(bot, message) {
    const conditions = new Parser(message.match[1]).parse()

    const client = new GitHubApiClient()

    client.getAllPullRequests(conditions).then((prs) => {
      bot.startConversation(message, (err, convo) => {
        convo.say(':memo: Review waiting list!')

        const messages = new PullRequests(prs, conditions).convertToSlackMessages()

        if (messages.length > 0) {
          _.each(messages, (pr) => convo.say(pr))
          convo.say("That's all. Please review!")
        } else {
          convo.say('No pull requests for now.')
        }

        convo.next()
      })
    })
  }

  static beforeValidate() {
    let errors = []

    if (!process.env.GITHUB_AUTH_TOKEN) {
      errors.push('Error: GITHUB_AUTH_TOKEN is missing.')
    }
    if (!process.env.SLACK_BOT_TOKEN) {
      errors.push('Error: SLACK_BOT_TOKEN is missing.')
    }
    if (!process.env.PERSONAL_CRON) {
      errors.push('Error: PERSONAL_CRON is missing.')
    }
    if (!process.env.PERSONAL_MAPPING_FILE) {
      errors.push('Error: PERSONAL_MAPPING_FILE is missing.')
    }

    if (errors.length > 0) {
      errors.forEach((error) => console.error(error))
      console.error('Cannot continue to start the bot due to critical lack of parameters.')
      process.exit(1)
    }
  }
}

module.exports = App
