'use strict'

const fs = require('fs')
const cron = require('cron-scheduler')
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
        this.gitHub = new GitHubApiClient()
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
        
        this.job = cron({ on: this.cronTime, timezone: 'Europe/Vienna', name: this.constructor.name }, ()=> {
            
            debug('start reminder')
        
            this.bot.api.users.list({}, (err, data) => {

                if (err) {
                    debug(err)
                    return
                }

                this.userMapping.forEach((mapping) => {

                    const matches = _(data.members).filter(m => ignoreCase.equals(mapping.slackUserName, m.name)).value()
                    if ( !matches || matches.length <= 0 ) {
                        debug(`no slack user found with mapping { ${mapping.slackUserName}, ${mapping.githubUser} }, skipping`)
                        return
                    }

                    this.gitHub.verifyUser(mapping.githubUser).then(()=>{

                        const conditions = new Parser(`review-requested:${mapping.githubUser}`).parse()
                        this.gitHub.getAllPullRequests(conditions).then((prs) => {

                            debug(`reminding ${mapping.slackUserName} of ${prs.length} open PRs for ${mapping.githubUser}`)
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

                        }).catch(error => debug(error))

                    }).catch(error => debug(error))
                })
                
            })

            debug('all done')
        })
    }

    tick() {
        
    }
}

module.exports = PersonalReminder