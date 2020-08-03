'use strict';

const axios = require("axios");
const yaml = require("yaml");
const fs = require("fs");
const _ = require("lodash");

const config = yaml.parse(fs.readFileSync('config.yml', 'utf8'));

const sentry = axios.create({
  baseURL: config.sentry.host,
  headers: {
    Authorization: `Bearer ${config.sentry.token}`,
    "Content-type": "application/json",
    Accept: "application/json"
  }
})

const youtrack = axios.create({
  baseURL: config.youtrack.host,
  headers: {
    Authorization: `Bearer ${config.youtrack.token}`,
    "Content-type": "application/json",
    Accept: "application/json"
  }
})

function createNewIssues(issues) {
  return Promise.all(_.each(issues, (issue) => {
    return youtrack.post("/api/issues", {
      summary: issue.title,
      description: `Sentry problem: ${issue.link}`,
      project: {
        id: config.youtrack.project
      }
    }).then(data => {
      console.info(`Created issue with id: %{data.data.id}`)
    })
      .catch((err) => {
        console.error(`Issue create error: ${err.message}`)
        if (err.response.data) {
          console.error(JSON.stringify(err.response.data, null, " "))
        }
      })
  }))
}

function youtrackProcess(setryIssues) {
  return youtrack.get("/api/issues", {
    params: {
      fields: "idReadable,project(id),summary"
    }
  }).then((youtrackIssues) => {

    const lst = _.map(youtrackIssues.data, data => { return { id: data.project.id, summary: data.summary } })

    _.remove(setryIssues, (issue) => {
      return (_.find(lst, { id: config.youtrack.project, summary: issue.title }))
    })

    return createNewIssues(setryIssues);

  }).catch((err) => {
    console.error(`YouTrack error: ${err.message}`);
  })
}

sentry.get(`/api/0/projects/sentry/${config.sentry.project}/issues/`, {
  params: {
    query: "is:unresolved",
    limit: 20
  }
}).then((res) => {
  return youtrackProcess(_.map(res.data, (item) => { return { title: item.title, link: item.permalink } }));
}).catch((err) => {
  console.error(`Sentry error: ${err.message}`);
})

