
const Voomo = artifacts.require('Voomo.sol')

const assert = require('assert')
const { balance, ether, expectRevert, expectEvent } = require('openzeppelin-test-helpers')
const { MIN_TEST_USERS_COUNT, LEVEL_2_FEE, REGISTRATION_FEE } = require('../constants')


contract('Voomo smart contract tests (X3/X4 MANUAL)', (accounts) => {
    let contractInstance
    const owner = accounts[0].toString()

    if (accounts.length < MIN_TEST_USERS_COUNT) {
        console.log('Please increase test users count and try again!')
        return
    }

    const filterAutoEventLogs = async (receipt, system) => {
        const { logs } = receipt
        const autoEvents = ['Registration', 'Reinvest', 'Upgrade', 'NewUserPlace', 'MissedEthReceive', 'SentExtraEthDividends']
        const filteredLogs = logs.filter(log => autoEvents.includes(log['event']))

        let modifiedEvents = filteredLogs.map(log => {
            let params

            if (log['event'] == autoEvents[0]) {
                params = {
                    user: log['args']['userId'].toString(),
                    referrer: log['args']['referrerId'].toString()
                }
            } else if (log['event'] == autoEvents[1]) {
                params = {
                    user: log['args']['user'],
                    currentReferrer: log['args']['currentReferrer'],
                    caller: log['args']['caller'],
                    matrix: log['args']['matrix'].toString(),
                    level: log['args']['level'].toString(),
                }
            } else if (log['event'] == autoEvents[2]) {
                params = {
                    user: log['args']['user'],
                    referrer: log['args']['referrer'],
                    matrix: log['args']['matrix'].toString(),
                    level: log['args']['level'].toString(),
                }
            } else if (log['event'] == autoEvents[3]) {
                params = {
                    user: log['args']['user'],
                    referrer: log['args']['referrer'],
                    matrix: log['args']['matrix'].toString(),
                    level: log['args']['level'].toString(),
                    place: log['args']['place'].toString(),
                }
            } else if (log['event'] == autoEvents[4]) {
                params = {
                    receiver: log['args']['receiver'],
                    from: log['args']['from'],
                    matrix: log['args']['matrix'].toString(),
                    level: log['args']['level'].toString()
                }
            } else if (log['event'] == autoEvents[5]) {
                params = {
                    from: log['args']['from'],
                    receiver: log['args']['receiver'],
                    matrix: log['args']['matrix'].toString(),
                    level: log['args']['level'].toString()
                }
            }

            params['event'] = log['event']

            return params
        })

        for (event of modifiedEvents) {
            if (event['event'] == autoEvents[1]) {
                const userData = await contractInstance.users(event['user'])
                const currentReferrerData = await contractInstance.users(event['currentReferrer'])
                const callerData = await contractInstance.users(event['caller'])

                event['user'] = userData['id'].toString()
                event['currentReferrer'] = currentReferrerData['id'].toString()
                event['caller'] = callerData['id'].toString()

                event['matrix'] = event['matrix'] === '1' ? 'X3' : 'X4'
            } else if (event['event'] == autoEvents[2] || event['event'] == autoEvents[3]) {
                const userData = await contractInstance.users(event['user'])
                const referrerData = await contractInstance.users(event['referrer'])
                event['user'] = userData['id'].toString()
                event['referrer'] = referrerData['id'].toString()
                event['matrix'] = event['matrix'] === '1' ? 'X3' : 'X4'
            } else if (event['event'] == autoEvents[4] || event['event'] == autoEvents[5]) {
                const receiverData = await contractInstance.users(event['receiver'])
                const fromData = await contractInstance.users(event['from'])
                event['receiver'] = receiverData['id'].toString()
                event['from'] = fromData['id'].toString()
                event['matrix'] = event['matrix'] === '1' ? 'X3' : 'X4'
            }
        }

        if (system === 'X3') {
            modifiedEvents = modifiedEvents.filter(event => event['matrix'] !== 'X4')
        } else if (system === 'X4') {
            modifiedEvents = modifiedEvents.filter(event => event['matrix'] !== 'X3')
        }

        return modifiedEvents
    }

    beforeEach(async () => {
        contractInstance = await Voomo.new(owner)
    })

    describe('Loop of registrations under 1 user', async () => {
        it('Registration events', async function () {
            this.timeout(8000000);
            let ownerProfit = 0
            for (let i = 1; i < accounts.length; i ++) {
                const balanceTracker = await balance.tracker(owner)

                // Pre-payment values from contract
                const newUserId = (await contractInstance.lastUserId.call()).toString()

                // Register user
                const receipt = await contractInstance.registration(owner, { from: accounts[i], value: REGISTRATION_FEE })
                console.log('#', newUserId, 'joined')

                const eventData = await filterAutoEventLogs(receipt, null)
                console.table(eventData)

                const balanceIncreased = await balanceTracker.delta()
                if (balanceIncreased.toString() !== '0') {
                    ownerProfit = ownerProfit + (balanceIncreased.toString() / 10**18)
                    console.log('User ID 1 Profit increased:', ownerProfit.toFixed(3), 'ETH')
                }

                console.log('------------------------')
            }
        })
    })

    describe('Loop of registrations under all users (X3)', async () => {
        it('Registration events', async function () {
            this.timeout(8000000);
            let referrerID = 0
            for (let i = 1; i < accounts.length; i ++) {

                // Pre-payment values from contract
                const newUserId = (await contractInstance.lastUserId.call()).toString()

                if (i > 3 && i % 3 === 1) {
                    referrerID++
                }

                // Register user
                const receipt = await contractInstance.registration(accounts[referrerID], { from: accounts[i], value: REGISTRATION_FEE })
                console.log('#', newUserId, 'joined')

                const eventData = await filterAutoEventLogs(receipt, 'X3')
                console.table(eventData)

                console.log('------------------------')
            }
        })
    })
})
