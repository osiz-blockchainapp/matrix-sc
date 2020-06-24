
const Voomo = artifacts.require('Voomo.sol')
const Owner = artifacts.require('Owner.sol')

const assert = require('assert')
const { balance, ether, expectRevert, expectEvent } = require('openzeppelin-test-helpers')
const { MIN_TEST_USERS_COUNT, ZERO_ADDRESS, REGISTRATION_FEE } = require('../constants')


contract('Voomo smart contract tests (X3/X4 AUTO)', (accounts) => {
    let contractInstance
    let owner

    // ============================
    // ACCOUNTS LENGTH VALIDATION
    // ============================

    if (accounts.length < MIN_TEST_USERS_COUNT) {
        console.log('Please increase test users count and try again!')
        return
    }

    // ============================
    // HELPERS
    // ============================

    /*
    * id,
    * level,
    * upline_id
    * upline
    * referrals []
    */
    const compareX3AutoValues = (contractState, expectedState) => {
        return(
            assert.equal(contractState['id'].toString(), expectedState[0].toString()),
            assert.equal(contractState['level'].toString(), expectedState[1].toString()),
            assert.equal(contractState['upline_id'].toString(), expectedState[2].toString()),
            assert.equal(contractState['upline'].toString(), expectedState[3].toString()),
            assert.deepEqual(contractState['referrals'], expectedState[4])
        )
    }

    /*
    * id,
    * level,
    * upline_id
    * upline
    * profit
    * firstLevelReferrals []
    * secondLevelReferrals []
    */
    const compareX4AutoValues = (contractState, expectedState) => {
        return(
            assert.equal(contractState['id'].toString(), expectedState[0].toString()),
            assert.equal(contractState['level'].toString(), expectedState[1].toString()),
            assert.equal(contractState['upline_id'].toString(), expectedState[2].toString()),
            assert.equal(contractState['upline'].toString(), expectedState[3].toString()),
            assert.deepEqual(contractState['firstLevelReferrals'], expectedState[4]),
            assert.deepEqual(contractState['secondLevelReferrals'], expectedState[5])
        )
    }

    const getUplines = async (referrer) => {
        const data = await contractInstance.methods['findAutoUplines(address)'](referrer)

        const x3Upline = {
            id: data['2'].toString(),
            addr: data['0']
        }

        const x4Upline = {
            id: data['3'].toString(),
            addr: data['1']
        }

        return { x3Upline, x4Upline }
    }

    const userRegistrationChecks = async (currentLastId, x3Upline, x4Upline, userAddr) => {
        const userExists = await contractInstance.isUserExists(userAddr)
        assert.equal(userExists, true)

        const userX3Auto = await contractInstance.getUserX3Auto(userAddr)
        const userX4Auto = await contractInstance.getUserX4Auto(userAddr)

        compareX3AutoValues(userX3Auto, [currentLastId, 1, x3Upline.id, x3Upline.addr, []])
        compareX4AutoValues(userX4Auto, [currentLastId, 1, x4Upline.id, x4Upline.addr, [], []])
    }

    const filterAutoEventLogs = async receipt => {
        const { logs } = receipt
        const autoEvents = ['AutoSystemLevelUp', 'AutoSystemEarning', 'AutoSystemReinvest', 'EthSent']
        const filteredLogs = logs.filter(log => autoEvents.includes(log['event']))

        let modifiedEvents = filteredLogs.map(log => {
            let params

            if (log['event'] == autoEvents[0]) {
                params = {
                    user: log['args']['user'],
                    level: log['args']['level'].toString(),
                    matrix: log['args']['matrix'].toString(),
                }
            } else if (log['event'] == autoEvents[1]) {
                params = {
                    to: log['args']['to'],
                    from: log['args']['from']
                }
            } else if (log['event'] == autoEvents[2]) {
                params = {
                    to: log['args']['to'],
                    from: log['args']['from'],
                    value: (log['args']['amount'].toString() / 10**18).toString(),
                    matrix: log['args']['matrix'].toString()
                }
            } else if (log['event'] == autoEvents[3]) {
                params = {
                    to: log['args']['to'],
                    amount: (log['args']['amount'].toString() / 10**18).toString(),
                    type: log['args']['isAutoSystem'] === true ? 'AUTO' : 'MANUAL'
                }
            }

            params['event'] = log['event']

            return params
        })

        for (event of modifiedEvents) {
            if (event['event'] == autoEvents[0]) {
                if (event['matrix'] === '1') {
                    const userX3Auto = await contractInstance.getUserX3Auto(event['user'])
                    event['user'] = userX3Auto['id'].toString()
                    event['matrix'] = 'X3'
                } else {
                    const userX4Auto = await contractInstance.getUserX4Auto(event['user'])
                    event['user'] = userX4Auto['id'].toString()
                    event['matrix'] = 'X4'
                }
            } else if (event['event'] == autoEvents[1]) {
                const toX4Auto = await contractInstance.getUserX4Auto(event['to'])
                const fromX4Auto = await contractInstance.getUserX4Auto(event['from'])
                event['to'] = toX4Auto['id'].toString()
                event['from'] = fromX4Auto['id'].toString()
            } else if (event['event'] == autoEvents[2]) {
                if (event['matrix'] === '1') {
                    const toX3Auto = await contractInstance.getUserX3Auto(event['to'])
                    const fromX3Auto = await contractInstance.getUserX3Auto(event['from'])
                    event['to'] = toX3Auto['id'].toString()
                    event['from'] = fromX3Auto['id'].toString()
                    event['matrix'] = 'X3'
                } else {
                    const toX4Auto = await contractInstance.getUserX4Auto(event['to'])
                    const fromX4Auto = await contractInstance.getUserX4Auto(event['from'])
                    event['to'] = toX4Auto['id'].toString()
                    event['from'] = fromX4Auto['id'].toString()
                    event['matrix'] = 'X4'
                }
            } else if (event['event'] == autoEvents[3]) {
                const toX3Auto = await contractInstance.getUserX3Auto(event['to'])
                event['to'] = toX3Auto['id'].toString()
            }
        }

        return modifiedEvents
    }

    // ============================
    // UNIT TEST START
    // ============================

    describe('5 registrations with deep state validations', async () => {
        owner = (await Owner.new(accounts[0].toString(), accounts[0].toString())).address
        contractInstance = await Voomo.new(owner)

        const alice = accounts[1].toString()
        const bob = accounts[2].toString()
        const john = accounts[3].toString()
        const tony = accounts[4].toString()

        it('Check status of owner after deployment', async () => {
            const ownerX3Auto = await contractInstance.getUserX3Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 1, 0, ZERO_ADDRESS, []])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, [], []])

            const ownerExists = await contractInstance.isUserExists(owner)
            assert.equal(ownerExists, true)
        })

        // Add Alice
        it('Register first user with owner as a upline', async () => {
            const balanceTracker = await balance.tracker(owner)
            await contractInstance.registration(owner, { from: alice, value: REGISTRATION_FEE })

            const balanceIncreased = await balanceTracker.delta()
            assert.equal(balanceIncreased.toString(), ether('0.075').toString())

            const userExists = await contractInstance.isUserExists(alice)
            assert.equal(userExists, true)
        })

        it('Check status of owner and alice after registration', async () => {
            const ownerX3Auto = await contractInstance.getUserX3Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 1, 0, ZERO_ADDRESS, [alice]])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, [alice], []])

            const aliceX3Auto = await contractInstance.getUserX3Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4Auto(alice)
            compareX3AutoValues(aliceX3Auto, [2, 1, 1, owner, []])
            compareX4AutoValues(aliceX4Auto, [2, 1, 1, owner, [], []])
        })

        // Add Bob
        it('Register new member under alice', async () => {
            const balanceTracker = await balance.tracker(owner)
            await contractInstance.registration(alice, { from: bob, value: REGISTRATION_FEE })

            const balanceIncreased = await balanceTracker.delta()
            assert.equal(balanceIncreased.toString(), ether('0.025').toString())

            const userExists = await contractInstance.isUserExists(bob)
            assert.equal(userExists, true)
        })

        it('Check status of owner and alice after 2nd user registration', async () => {
            const ownerX3Auto = await contractInstance.getUserX3Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 1, 0, ZERO_ADDRESS, [alice]])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, [alice], [bob]])

            const aliceX3Auto = await contractInstance.getUserX3Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4Auto(alice)
            compareX3AutoValues(aliceX3Auto, [2, 1, 1, owner, [bob]])
            compareX4AutoValues(aliceX4Auto, [2, 1, 1, owner, [bob], []])

            const bobX3Auto = await contractInstance.getUserX3Auto(bob)
            const bobX4Auto = await contractInstance.getUserX4Auto(bob)
            compareX3AutoValues(bobX3Auto, [3, 1, 2, alice, []])
            compareX4AutoValues(bobX4Auto, [3, 1, 2, alice, [], []])
        })

        // Add John
        it('Register new member under bob', async () => {
            const ownerBalanceTracker = await balance.tracker(owner)
            const aliceBalanceTracker = await balance.tracker(alice)
            const bobBalanceTracker = await balance.tracker(bob)

            await contractInstance.registration(bob, { from: john, value: REGISTRATION_FEE })

            const ownerBalanceIncreased = await ownerBalanceTracker.delta()
            const aliceBalanceIncreased = await aliceBalanceTracker.delta()
            const bobBalanceIncreased = await bobBalanceTracker.delta()

            assert.equal(ownerBalanceIncreased.toString(), ether('0').toString())
            assert.equal(bobBalanceIncreased.toString(), ether('0.025').toString())
            assert.equal(aliceBalanceIncreased.toString(), ether('0.025').toString())

            const userExists = await contractInstance.isUserExists(john)
            assert.equal(userExists, true)
        })

        it('Check status of owner, alice and bob after 3th user registration', async () => {
            const ownerX3Auto = await contractInstance.getUserX3Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 1, 0, ZERO_ADDRESS, [alice]])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, ether('0.025'), [alice], [bob]])

            const aliceX3Auto = await contractInstance.getUserX3Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4Auto(alice)
            compareX3AutoValues(aliceX3Auto, [2, 1, 1, owner, [bob]])
            compareX4AutoValues(aliceX4Auto, [2, 1, 1, owner, [bob], [john]])

            const bobX3Auto = await contractInstance.getUserX3Auto(bob)
            const bobX4Auto = await contractInstance.getUserX4Auto(bob)
            compareX3AutoValues(bobX3Auto, [3, 1, 2, alice, [john]])
            compareX4AutoValues(bobX4Auto, [3, 1, 2, alice, [john], []])

            const johnX3Auto = await contractInstance.getUserX3Auto(john)
            const johnX4Auto = await contractInstance.getUserX4Auto(john)
            compareX3AutoValues(johnX3Auto, [4, 1, 3, bob, []])
            compareX4AutoValues(johnX4Auto, [4, 1, 3, bob, [], []])
        })

        // Add Tony
        it('Register new member under john', async () => {
            const ownerBalanceTracker = await balance.tracker(owner)
            const aliceBalanceTracker = await balance.tracker(alice)
            const bobBalanceTracker = await balance.tracker(bob)
            const johnBalanceTracker = await balance.tracker(john)

            await contractInstance.registration(john, { from: tony, value: REGISTRATION_FEE })

            const ownerBalanceIncreased = await ownerBalanceTracker.delta()
            const aliceBalanceIncreased = await aliceBalanceTracker.delta()
            const bobBalanceIncreased = await bobBalanceTracker.delta()
            const johnBalanceIncreased = await johnBalanceTracker.delta()

            assert.equal(ownerBalanceIncreased.toString(), ether('0').toString())
            assert.equal(aliceBalanceIncreased.toString(), ether('0').toString())
            assert.equal(bobBalanceIncreased.toString(), ether('0.025').toString())
            assert.equal(johnBalanceIncreased.toString(), ether('0.025').toString())

            const userExists = await contractInstance.isUserExists(tony)
            assert.equal(userExists, true)
        })

        it('Check status of owner, alice, bob, john after 4th user registration', async () => {
            const ownerX3Auto = await contractInstance.getUserX3Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 1, 0, ZERO_ADDRESS, [alice]])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, [alice], [bob]])

            const aliceX3Auto = await contractInstance.getUserX3Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4Auto(alice)
            compareX3AutoValues(aliceX3Auto, [2, 1, 1, owner, [bob]])
            compareX4AutoValues(aliceX4Auto, [2, 1, 1, owner, [bob], [john]])

            const bobX3Auto = await contractInstance.getUserX3Auto(bob)
            const bobX4Auto = await contractInstance.getUserX4Auto(bob)
            compareX3AutoValues(bobX3Auto, [3, 1, 2, alice, [john]])
            compareX4AutoValues(bobX4Auto, [3, 1, 2, alice, [john], [tony]])

            const johnX3Auto = await contractInstance.getUserX3Auto(john)
            const johnX4Auto = await contractInstance.getUserX4Auto(john)
            compareX3AutoValues(johnX3Auto, [4, 1, 3, bob, [tony]])
            compareX4AutoValues(johnX4Auto, [4, 1, 3, bob, [tony], []])

            const tonyX3Auto = await contractInstance.getUserX3Auto(tony)
            const tonyX4Auto = await contractInstance.getUserX4Auto(tony)
            compareX3AutoValues(tonyX3Auto, [5, 1, 4, john, []])
            compareX4AutoValues(tonyX4Auto, [5, 1, 4, john, [], []])
        })
    })

    describe('==== UNIT TEST PLAN ===', async () => {
        it('', async () => {
            owner = (await Owner.new(accounts[0].toString(), accounts[0].toString())).address
            contractInstance = await Voomo.new(owner)

            console.log('Step 1. Register 200 new referrals only under owner (200 users)')
            console.log('Step 2. Register 3 referrals under each new user (300 users)')
            console.log('Step 3. Register 4 referrals under each new user (300 users)')
            await new Promise(resolve => setTimeout(resolve, 5000))
        })

        it('Register rest users', async function () {
            this.timeout(80000000);
            let ownerProfit = 0
            let referrer = owner

            for (let i = 1; i < accounts.length; i ++) {
                if (i > 200 && i < 500) {
                    if ((i - 200) % 3 === 0) {
                        referrer = accounts[i - 1]
                    }
                }

                if (i > 500 && i < 800) {
                    if ((i - 500) % 6 === 0) {
                        referrer = accounts[i - 1]
                    }
                }

                const balanceTracker = await balance.tracker(accounts[0])

                // Pre-payment values from contract
                const newUserId = (await contractInstance.lastUserId.call()).toString()
                const { x3Upline, x4Upline } = await getUplines(referrer)

                const newAutoUser = {
                    id: newUserId,
                    addr: accounts[i]
                }

                // Register user
                const receipt = await contractInstance.registration(referrer, { from: accounts[i], value: REGISTRATION_FEE })
                console.log('#', newAutoUser.id, 'joined')

                // Validate user state after registration
                await userRegistrationChecks(newAutoUser.id, x3Upline, x4Upline, accounts[i])

                const eventData = await filterAutoEventLogs(receipt)
                eventData.push({
                    'x3Upline': x3Upline['id'],
                    'x4Upline': x4Upline['id']
                })
                console.table(eventData)

                const balanceIncreased = await balanceTracker.delta()
                if (balanceIncreased.toString() !== '0') {
                    ownerProfit = ownerProfit + (balanceIncreased.toString() / 10**18)
                    console.log('User ID 1 Profit increased by ', (balanceIncreased.toString() / 10**18) + 'ETH /', ownerProfit.toFixed(3), 'ETH')
                }

                console.log('------------------------')
            }
        })
    })
})
