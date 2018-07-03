'use strict'

const Botkit = require('botkit')
const _ = require('lodash')

class SlackBot {
  constructor() {
    let myDebug = false
    if ( _.includes(process.env.DEBUG, 'slackbot')) {
      myDebug = true
    }
    this.controller = Botkit.slackbot({debug: myDebug})
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
