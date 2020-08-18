const fs = require('fs')
const ora = require('ora')
const axios = require('axios')
const chalk = require('chalk')
const moment = require('moment')
const inquirer = require('inquirer')

const baseUrl = 'https://api.pontomais.com.br/api'

const getEmployeeId = async (credentials) => {
    const { data } = await axios.get(`${baseUrl}/session`, { headers: credentials })
    
    return data.session.employee.id
}

const getCredentials = async () => {
    const credentialsPath = './credentials.json'
    if (fs.existsSync(credentialsPath)) {
        const credentials = fs.readFileSync(credentialsPath)
        return JSON.parse(credentials)
    }
    
    const auth = await inquirer.prompt([
        {
            type: 'string',
            name: 'login',
            message: 'Login'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Senha'
        }
    ])

    const spinner = ora().start()
    const { data } = await axios.post(`${baseUrl}/auth/sign_in`, auth)
    spinner.stop()

    const credentials = {
        uid: auth.login,
        client: data.client_id,
        'access-token': data.token,
        'token-type': 'Bearer'
    }

    credentials.employeeId = await getEmployeeId(credentials)

    fs.writeFileSync(credentialsPath, JSON.stringify(credentials))

    return credentials
}

const getData = async () => {
    const credentials = await getCredentials()

    const spinner = ora().start()
    const url = `${baseUrl}/employees/timeline/${credentials.employeeId}`
    const { data } = await axios.get(url, { headers: credentials })
    spinner.stop()
    
    const dates = data.timeline.map(timeline => moment(timeline.datetime))
    
    return dates
}

const calculateMinutes = (dates) => {
    const sortedDates = dates.sort((a, b) => a.valueOf() - b.valueOf())
    
    if (sortedDates.length % 2) {
        sortedDates.push(moment())
    }

    let minutes = 0
    sortedDates.forEach((date, index) => {
        if (!index) return
        if (index % 2) {
            minutes += moment.duration(date.diff(sortedDates[index - 1])).asMinutes()
        }
    })

    return minutes
}

const handle = async () => {
    const dates = await getData()
    const minutes = calculateMinutes(dates)
    const hours = parseInt(minutes / 60)
    const rest = parseInt(minutes % 60)

    console.log(chalk.green(`\nTotal: ${hours}h e ${rest}m`))
}

handle()