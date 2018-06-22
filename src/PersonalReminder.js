'use strict'

const fs = require('fs')
const Cron = require('cron')
const _ = require('lodash')
const GitHubApiClient = require("./GitHubApiClient")
const Parser = require('./Parser')
const PullRequests = require('./PullRequests')
const ignoreCase = require('ignore-case')
const debug = require('debug')('PersonalReminder')


class PersonalReminder {
    constructor(bot) {
        this.cronTime = process.env.PERSONAL_CRON
        this.mappingFile = process.env.PERSONAL_MAPPING_FILE
        this.bot = bot
    }

    start() {
        if (!this.cronTime || this.cronTime.length <= 0) {
            debug('env PERSONAL_CRON not defined, not starting personal reminders')
            return
        }
        console.log('starting personal reminder with cron ', this.cronTime)
        if (!this.mappingFile || !fs.existsSync(this.mappingFile)) {
            debug('env PERSONAL_MAPPING_FILE not readable, not starting personal reminders')
            return
        }
        this.userMapping = _(JSON.parse(fs.readFileSync(this.mappingFile)))
        if (this.userMapping.length <= 0) {
            debug('env PERSONAL_MAPPING_FILE no mappings found, not starting personal reminders')
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
                    debug(`no slack user found with mapping { ${mapping.slackUserName}, ${mapping.githubUser} }, skipping`)
                    continue
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
                    debug(error)
                })
            }
        })
    }
}

module.exports = PersonalReminder