'use strict'

const _ = require('lodash')

class PullRequests {
  constructor(prs, {label, reviewer}) {
    this.prs = prs
    this.label = label
    this.reviewer = reviewer

    _.bindAll(this, ['matchesLabel', 'matchesReviewer'])
  }

  isIgnorable(pr) {
    const ignoreWords = ['wip', 'dontmerge', 'donotmerge']
    const regex = new RegExp(`(${ignoreWords.join('|')})`, 'i')
    const sanitizedTitle = pr.title.replace(/'|\s+/g, '')
    return !!sanitizedTitle.match(regex)
  }

  matchesLabel(pr) {
    if (this.label.values.length > 0) {
      const result = _.some(this.label.values, (_label) => {
        return _.flatMap(pr.labels.nodes, (label) => label.name).includes(_label)
      })
      return (this.label.inclusion ? result : !result)
    } else {
      return true
    }
  }

  matchesReviewer(pr) {
    if (this.reviewer.values.length > 0) {
      const result = _.some(this.reviewer.values, (_reviewer) => {
        // Reviewer could be a user or a team
        const matched = _reviewer.match(/^.+\/(.+)$/)
        const usernameOrTeamName = matched ? matched[1] : _reviewer

        return _.flatMap(pr.reviewRequests.nodes, (request) => {
          return request.requestedReviewer.login || request.requestedReviewer.name
        }).includes(usernameOrTeamName)
      })
      return (this.reviewer.inclusion ? result : !result)
    } else {
      return true
    }
  }

  formatPullRequest(pr, index) {
    let reviewText = "no reviewer assigned"
    const reviewers = _.map(pr.reviewRequests.nodes, rr => { return rr.requestedReviewer.login || rr.requestedReviewer.name })
    if (reviewers.length > 0) {
      reviewText = `reviewer: ${reviewers.join(' ')}`
    }
    return `${index+1}. \`${pr.title}\` ${pr.url} by ${pr.author.login} ${reviewText}`
  }

  convertToSlackMessages() {
    return _(this.prs)
      .reject(this.isIgnorable)
      .filter(this.matchesLabel)
      .filter(this.matchesReviewer)
      .map(this.formatPullRequest)
      .value()
  }
}

module.exports = PullRequests
