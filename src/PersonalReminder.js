'use strict'

const fs = require('fs')
const Cron = require('cron')
const _ = require('lodash')
const GitHubApiClient = require("./GitHubApiClient")
const Parser = require('./Parser')
const PullRequests = require('./PullRequests')
const ignoreCase = require('ignore-case')


class PersonalReminder {
    constructor(bot) {
        this.cronTime = process.env.PERSONAL_CRON
        this.mappingFile = process.env.PERSONAL_MAPPING_FILE
        this.bot = bot
    }

    start() {
        console.log('starting personal reminder with cron ', this.cronTime)
        if (!fs.existsSync(this.mappingFile)) {
            console.log('no mappings file found, skipping personal reminders')
            return
        }
        this.userMapping = _(JSON.parse(fs.readFileSync(this.mappingFile)))
        if (this.userMapping.length <= 0) {
            console.log('no mappings in file found, skipping personal reminders')
            return
        }
        this.job = new Cron.CronJob(this.cronTime, this.tick, null, true, 'Europe/Vienna', this)
    }

    tick() {
        this.bot.api.users.list({}, (err, data) => {

            if (err) {
                console.error(err)
                return
            }

            const gitHub = new GitHubApiClient()

            for (const mapping of this.userMapping) {

                const matches = _(data.members).filter(m => ignoreCase.equals(mapping.slackUserName, m.name)).value()
                if ( !matches || matches.length <= 0 ) {
                    console.log("not found:", mapping.slackUserName)
                    return
                }

                const conditions = new Parser(`review-requested:${mapping.githubUser}`).parse()

                gitHub.getAllPullRequests(conditions).then((prs) => {
                    if (prs.length>0) {
                        this.bot.startPrivateConversation({ user: matches[0].id } , (err, convo) => {

                            if (err) {
                                console.log(err)
                                return
                            }

                            const messages = new PullRequests(prs, conditions).convertToSlackMessages()

                            if (messages.length > 0) {
                                convo.say(':memo: Please review!')
                                _.each(messages, (pr) => convo.say(pr))
                                convo.say("That's all. Please review!")
                            }

                            convo.next()
                        })
                    }
                }).catch(error => {
                    console.error(error)
                })
            }
        })
    }
}

module.exports = PersonalReminder