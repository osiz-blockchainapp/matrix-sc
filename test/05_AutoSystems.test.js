
const Voomo = artifacts.require('Voomo.sol')

const assert = require('assert')
const { balance, ether, expectRevert, expectEvent } = require('openzeppelin-test-helpers')
const { MIN_TEST_USERS_COUNT, ZERO_ADDRESS, REGISTRATION_FEE } = require('../constants')


contract('Voomo smart contract tests (X3/X4 AUTO)', (accounts) => {
    let contractInstance
    const owner = accounts[0].toString()

    if (accounts.length < MIN_TEST_USERS_COUNT) {
        console.log('Please increase test users count and try again!')
        return
    }
    /*
    * id,
    * level,
    * upline_id
    * upline
    * profit
    * referrals []
    */
    const compareX3AutoValues = (contractState, expectedState) => {
        return(
            assert.equal(contractState['id'].toString(), expectedState[0].toString()),
            assert.equal(contractState['level'].toString(), expectedState[1].toString()),
            assert.equal(contractState['upline_id'].toString(), expectedState[2].toString()),
            assert.equal(contractState['upline'].toString(), expectedState[3].toString()),
            assert.equal(contractState['profit'].toString(), expectedState[4].toString()),
            assert.deepEqual(contractState['referrals'], expectedState[5])
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
            assert.equal(contractState['profit'].toString(), expectedState[4].toString()),
            assert.deepEqual(contractState['firstLevelReferrals'], expectedState[5]),
            assert.deepEqual(contractState['secondLevelReferrals'], expectedState[6])
        )
    }

    const getUplines = async () => {
        const data = await contractInstance.findAutoUplines()

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

        compareX3AutoValues(userX3Auto, [currentLastId, 1, x3Upline.id, x3Upline.addr, 0, []])
        compareX4AutoValues(userX4Auto, [currentLastId, 1, x4Upline.id, x4Upline.addr, 0, [], []])
    }

    const filterAutoEventLogs = async receipt => {
        const { logs } = receipt
        const autoEvents = ['AutoSystemLevelUp', 'AutoSystemEarning', 'AutoSystemReinvest']
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
            }
        }

        return modifiedEvents
    }

    before(async () => {
        contractInstance = await Voomo.new(owner)
    })

    describe('First registrations', async () => {
        const alice = accounts[1].toString()
        const bob = accounts[2].toString()
        const john = accounts[3].toString()
        const tony = accounts[4].toString()

        it('Check status of owner after deployment', async () => {
            const ownerX3Auto = await contractInstance.getUserX3Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4Auto(owner)
            compareX3AutoValues(ownerX3Auto, [0, 0, 0, ZERO_ADDRESS, 0, []])
            compareX4AutoValues(ownerX4Auto, [0, 0, 0, ZERO_ADDRESS, 0, [], []])

            const ownerExists = await contractInstance.isUserExists(owner)
            assert.equal(ownerExists, true)
        })

        // Add Owner
        it('Register first user with owner as a upline', async () => {
            const balanceTracker = await balance.tracker(owner)
            await contractInstance.registration(owner, { from: alice, value: REGISTRATION_FEE })

            const balanceIncreased = await balanceTracker.delta()
            assert.equal(balanceIncreased.toString(), ether('0.1').toString())

            const userExists = await contractInstance.isUserExists(alice)
            assert.equal(userExists, true)
        })

        it('Check status of owner and alice after registration', async () => {
            const ownerX3Auto = await contractInstance.getUserX3Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 1, 0, ZERO_ADDRESS, 0, []])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, 0, [], []])

            const aliceX3Auto = await contractInstance.getUserX3Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4Auto(alice)
            compareX3AutoValues(aliceX3Auto, [0, 0, 0, ZERO_ADDRESS, 0, []])
            compareX4AutoValues(aliceX4Auto, [0, 0, 0, ZERO_ADDRESS, 0, [], []])
        })

        // Add Alice
        it('Register new member under alice', async () => {
            const balanceTracker = await balance.tracker(owner)
            await contractInstance.registration(alice, { from: bob, value: REGISTRATION_FEE })

            const balanceIncreased = await balanceTracker.delta()
            assert.equal(balanceIncreased.toString(), ether('0.05').toString())

            const userExists = await contractInstance.isUserExists(bob)
            assert.equal(userExists, true)
        })

        it('Check status of owner and alice after 2nd user registration', async () => {
            const ownerX3Auto = await contractInstance.getUserX3Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 1, 0, ZERO_ADDRESS, ether('0.025'), [alice]])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, 0, [alice], []])

            const aliceX3Auto = await contractInstance.getUserX3Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4Auto(alice)
            compareX3AutoValues(aliceX3Auto, [2, 1, 1, owner, 0, []])
            compareX4AutoValues(aliceX4Auto, [2, 1, 1, owner, 0, [], []])

            const bobX3Auto = await contractInstance.getUserX3Auto(bob)
            const bobX4Auto = await contractInstance.getUserX4Auto(bob)
            compareX3AutoValues(bobX3Auto, [0, 0, 0, ZERO_ADDRESS, 0, []])
            compareX4AutoValues(bobX4Auto, [0, 0, 0, ZERO_ADDRESS, 0, [], []])
        })

        // Add Bob
        it('Register new member under bob', async () => {
            const ownerBalanceTracker = await balance.tracker(owner)
            const aliceBalanceTracker = await balance.tracker(alice)
            const bobBalanceTracker = await balance.tracker(bob)

            await contractInstance.registration(bob, { from: john, value: REGISTRATION_FEE })

            const ownerBalanceIncreased = await ownerBalanceTracker.delta()
            const aliceBalanceIncreased = await aliceBalanceTracker.delta()
            const bobBalanceIncreased = await bobBalanceTracker.delta()

            assert.equal(ownerBalanceIncreased.toString(), ether('0.075').toString())
            assert.equal(bobBalanceIncreased.toString(), ether('0.025').toString())
            assert.equal(aliceBalanceIncreased.toString(), ether('0.025').toString())

            const userExists = await contractInstance.isUserExists(john)
            assert.equal(userExists, true)
        })

        it('Check status of owner, alice and bob after 3th user registration', async () => {
            const ownerX3Auto = await contractInstance.getUserX3Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 2, 0, ZERO_ADDRESS, 0, [alice, bob]])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, 0, [alice, bob], []])

            const aliceX3Auto = await contractInstance.getUserX3Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4Auto(alice)
            compareX3AutoValues(aliceX3Auto, [2, 1, 1, owner, 0, []])
            compareX4AutoValues(aliceX4Auto, [2, 1, 1, owner, 0, [], []])

            const bobX3Auto = await contractInstance.getUserX3Auto(bob)
            const bobX4Auto = await contractInstance.getUserX4Auto(bob)
            compareX3AutoValues(bobX3Auto, [3, 1, 1, owner, 0, []])
            compareX4AutoValues(bobX4Auto, [3, 1, 1, owner, 0, [], []])

            const johnX3Auto = await contractInstance.getUserX3Auto(john)
            const johnX4Auto = await contractInstance.getUserX4Auto(john)
            compareX3AutoValues(johnX3Auto, [0, 0, 0, ZERO_ADDRESS, 0, []])
            compareX4AutoValues(johnX4Auto, [0, 0, 0, ZERO_ADDRESS, 0, [], []])
        })

        // Add John
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

            assert.equal(ownerBalanceIncreased.toString(), ether('0.025').toString())
            assert.equal(aliceBalanceIncreased.toString(), ether('0.0').toString())
            assert.equal(bobBalanceIncreased.toString(), ether('0.025').toString())
            assert.equal(johnBalanceIncreased.toString(), ether('0.025').toString())

            const userExists = await contractInstance.isUserExists(tony)
            assert.equal(userExists, true)
        })

        it('Check status of owner, alice, bob, john after 4th user registration', async () => {
            const ownerX3Auto = await contractInstance.getUserX3Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 2, 0, ZERO_ADDRESS, 0, [alice, bob, john]])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, ether('0.025'), [alice, bob], [john]])

            const aliceX3Auto = await contractInstance.getUserX3Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4Auto(alice)
            compareX3AutoValues(aliceX3Auto, [2, 1, 1, owner, 0, []])
            compareX4AutoValues(aliceX4Auto, [2, 1, 1, owner, 0, [john], []])

            const bobX3Auto = await contractInstance.getUserX3Auto(bob)
            const bobX4Auto = await contractInstance.getUserX4Auto(bob)
            compareX3AutoValues(bobX3Auto, [3, 1, 1, owner, 0, []])
            compareX4AutoValues(bobX4Auto, [3, 1, 1, owner, 0, [], []])

            const johnX3Auto = await contractInstance.getUserX3Auto(john)
            const johnX4Auto = await contractInstance.getUserX4Auto(john)
            compareX3AutoValues(johnX3Auto, [4, 1, 1, owner, 0, []])
            compareX4AutoValues(johnX4Auto, [4, 1, 2, alice, 0, [], []])

            const tonyX3Auto = await contractInstance.getUserX3Auto(tony)
            const tonyX4Auto = await contractInstance.getUserX4Auto(tony)
            compareX3AutoValues(tonyX3Auto, [0, 0, 0, ZERO_ADDRESS, 0, []])
            compareX4AutoValues(tonyX4Auto, [0, 0, 0, ZERO_ADDRESS, 0, [], []])
        })
    })

    describe('Loop of registrations', async () => {
        it('Register rest users', async function () {
            this.timeout(8000000);
            let ownerProfit = 0
            for (let i = 5; i < accounts.length; i ++) {
                const balanceTracker = await balance.tracker(owner)

                // Pre-payment values from contract
                const newUserId = (await contractInstance.autoSystemLastUserId.call()).toString()
                const { x3Upline, x4Upline } = await getUplines()

                const newAutoUser = {
                    id: newUserId,
                    addr: accounts[i - 1]
                }

                // Register user
                const receipt = await contractInstance.registration(newAutoUser.addr, { from: accounts[i], value: REGISTRATION_FEE })
                console.log('#', newAutoUser.id, 'joined')

                // Validate user state after registration
                await userRegistrationChecks(newAutoUser.id, x3Upline, x4Upline, accounts[i - 1])

                const eventData = await filterAutoEventLogs(receipt)
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
})
