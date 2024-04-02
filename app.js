const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbpath = path.join(__dirname, 'covid19India.db')
let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3002, () => {
      console.log('success')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDbAndServer()

const convertObjectToResponseObject = dbOdject => {
  return {
    stateName: dbOdject.state_name,
    population: dbOdject.population,
    districtName: dbOdject.district_name,
    districtId: dbOdject.district_id,
    stateId: dbOdject.state_id,
    cases: dbOdject.csaes,
    cured: dbOdject.cured,
    active: dbOdject.active,
    deaths: dbOdject.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const stateNames = `
    SELECT *
    FROM state;
    `
  const stateArray = await db.all(stateNames)
  response.send(
    stateArray.map(eachObject => convertObjectToResponseObject(eachObject)),
  )
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const stateQuery = `
    SELECT *
    FROM state
    WHERE state_id = ${stateId} 
    `
  const stateDetails = await db.get(stateQuery)
  response.send(convertObjectToResponseObject(stateDetails))
})

app.post('/districts/', async (request, response) => {
  const newDist = request.body
  const {districtName, stateId, cases, cured, active, deaths} = newDist
  const addingNewDist = `
    INSERT INTO
    district (district_name,
    state_id,
    cases,
    cured,
    active,
    deaths)
    VALUES(
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
    )
    `
  const dbResponse = await db.run(addingNewDist)
  const newDistDetails = dbResponse.lastID
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const distDetails = `
    SELECT *
    FROM district
    WHERE district_id = ${districtId};
    `
  const distArray = await db.get(distDetails)
  response.send(convertObjectToResponseObject(distArray))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteQuery = `
    DELETE FROM 
    district
    WHERE district_id = ${districtId};
    `
  await db.run(deleteQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {distDetails} = request.body
  const {districtName, stateId, cases, cured, active, deaths} = distDetails

  const updatedDist = `
    UPDATE district SET
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}'
    WHERE 
    district_id = ${districtId};
    `
  await db.run(updatedDist)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const stateQuery2 = `
    SELECT
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM 
    district
    WHERE 
    state_id = ${stateId}
    `
  const stateDetails2 = await db.get(stateQuery2)
  response.send({
    totalCases: stateDetails2['SUM(cases)'],
    totalCured: stateDetails2['SUM(cured)'],
    totalActive: stateDetails2['SUM(active)'],
    totalDeaths: stateDetails2['SUM(deaths)'],
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const stateQuery = `
    SELECT state_name
    FROM state
    NATURAL JOIN district 
    WHERE district_id = ${districtId}
    `
  const stateName = await db.get(stateQuery)
  response.send(convertObjectToResponseObject(stateName))
})

module.exports = app
