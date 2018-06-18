'use strict'

const Cron = require('cron')

class PersonalReminder {
  constructor(botController) {
    this.cronTime = process.env.PERSONAL_CRON
    this.botController = botController
  }

  start() {
    this.job = new Cron.CronJob(this.cronTime, this.tick, null, false, 'Europe/Vienna', this)
  }

  tick() {
    console.log("tick: ", this.cronTime)
  }
}

module.exports = PersonalReminder