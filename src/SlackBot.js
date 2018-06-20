'use strict'

const Botkit = require('botkit')

class SlackBot {
  constructor() {
    this.controller = Botkit.slackbot({debug: !!process.env.DEBUG})
  }

  spawn() {
    this.controller.spawn({token: process.env.SLACK_BOT_TOKEN, retry: Infinity})
      .startRTM((err, _bot, _payload) => {
        if (err) throw new Error('Could not connect to Slack')
      })
  }

  getController() {
    return this.controller
  }
}

module.exports = SlackBot
