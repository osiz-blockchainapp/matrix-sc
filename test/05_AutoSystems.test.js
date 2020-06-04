
const Voomo = artifacts.require('Voomo.sol')

const assert = require('assert')
const { BN, time, constants, balance, ether, expectRevert } = require('openzeppelin-test-helpers')
const { MIN_TEST_USERS_COUNT, ZERO_ADDRESS, REGISTRATION_FEE } = require('../constants')

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

contract('Voomo smart contract tests', (accounts) => {
    let contractInstance
    const owner = accounts[0].toString()

    if (accounts.length < MIN_TEST_USERS_COUNT) {
        console.log('Please increase test users count and try again!')
        return
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

        const userX3Auto = await contractInstance.getUserX3_Auto(userAddr)
        const userX4Auto = await contractInstance.getUserX4_Auto(userAddr)
        compareX3AutoValues(userX3Auto, [currentLastId, 1, x3Upline.id, x3Upline.addr, 0, []])
        compareX4AutoValues(userX4Auto, [currentLastId, 1, x4Upline.id, x4Upline.addr, 0, [], []])
    }

    const x3UplineChecks = async (x3Upline, newAutoUser) => {
        const isReinvest = newAutoUser.id == (x3Upline.id * 3) + 1
        const isFirstUpgrade = newAutoUser.id == (x3Upline.id * 3) - 1
        const isSecondUpgrade = newAutoUser.id == (x3Upline.id * 3)

        const x3UplineAuto = await contractInstance.getUserX3_Auto(x3Upline.addr)
        const x3ReinvestReceiver = await contractInstance.getUserX3_Auto(x3UplineAuto['upline'])

        if (isReinvest) {
            // Check balance
            console.log(`X3: #${x3ReinvestReceiver.id} reinvest received (+ 0.025)`)
        } else {
            if (isFirstUpgrade) {
                assert.equal(x3UplineAuto['profit'].toString(), ether('0.025').toString())
                console.log(`X3: #${x3Upline.id} upgrade (+ 0.025)`)
            } else if (isSecondUpgrade) {
                assert.equal(x3UplineAuto['profit'].toString(), ether('0').toString())
                console.log(`X3: #${x3Upline.id} new level ${x3UplineAuto['level']} achieved`)
            }
        }
    }

    const x4UplineChecks = async (x4Upline, newAutoUser) => {
        const x4UplineData = await contractInstance.getUserX4_Auto(x4Upline.addr)
        const x4UplineUplineData = await contractInstance.getUserX4_Auto(x4UplineData['upline'])
        const x4ReinvestReceiverData = await contractInstance.getUserX4_Auto((await contractInstance.findX4AutoReinvestReceiver(x4UplineData['upline'])))

        const isReinvest = x4UplineUplineData['secondLevelReferrals'].length == 4
        const isFirstUpgrade = x4UplineUplineData['secondLevelReferrals'].length == 1 && x4UplineData['firstLevelReferrals'].length == 1
        const isSecondUpgrade = x4UplineUplineData['secondLevelReferrals'].length == 2 && x4UplineData['firstLevelReferrals'].length == 2
        const isEarning = x4UplineUplineData['secondLevelReferrals'].length == 3 && x4UplineData['firstLevelReferrals'].length == 1

        if (isReinvest) {
            console.log(`X4: #${x4ReinvestReceiverData['id'] == 0 ? '1' : x4ReinvestReceiverData.id} reinvest received`)
        } else if (isEarning) {
            console.log(`X4: #${x4UplineUplineData['id']} earning (+ 0.025)`)
        } else {
            if (isFirstUpgrade) {
                assert.equal(x4UplineUplineData['profit'].toString(), ether('0.025').toString())
                console.log(`X4: #${x4UplineUplineData['id']} upgrade (+ 0.025)`)
            } else if (isSecondUpgrade) {
                assert.equal(x4UplineUplineData['profit'].toString(), ether('0').toString())
                console.log(`X4: #${x4UplineUplineData['id']} new level ${x4UplineUplineData['level']} achieved`)

                const ownerAddr = await contractInstance.owner.call()
                const ownerData = await contractInstance.getUserX4_Auto(ownerAddr)
                console.log('X4: Owner level', ownerData['level'].toString())
                console.log('X4: Owner profit', ownerData['profit'].toString())
            }
        }
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
            const ownerX3Auto = await contractInstance.getUserX3_Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4_Auto(owner)
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
            const ownerX3Auto = await contractInstance.getUserX3_Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4_Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 1, 0, ZERO_ADDRESS, 0, []])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, 0, [], []])

            const aliceX3Auto = await contractInstance.getUserX3_Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4_Auto(alice)
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
            const ownerX3Auto = await contractInstance.getUserX3_Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4_Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 1, 0, ZERO_ADDRESS, ether('0.025'), [alice]])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, 0, [alice], []])

            const aliceX3Auto = await contractInstance.getUserX3_Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4_Auto(alice)
            compareX3AutoValues(aliceX3Auto, [2, 1, 1, owner, 0, []])
            compareX4AutoValues(aliceX4Auto, [2, 1, 1, owner, 0, [], []])

            const bobX3Auto = await contractInstance.getUserX3_Auto(bob)
            const bobX4Auto = await contractInstance.getUserX4_Auto(bob)
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
            const ownerX3Auto = await contractInstance.getUserX3_Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4_Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 2, 0, ZERO_ADDRESS, 0, [alice, bob]])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, 0, [alice, bob], []])

            const aliceX3Auto = await contractInstance.getUserX3_Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4_Auto(alice)
            compareX3AutoValues(aliceX3Auto, [2, 1, 1, owner, 0, []])
            compareX4AutoValues(aliceX4Auto, [2, 1, 1, owner, 0, [], []])

            const bobX3Auto = await contractInstance.getUserX3_Auto(bob)
            const bobX4Auto = await contractInstance.getUserX4_Auto(bob)
            compareX3AutoValues(bobX3Auto, [3, 1, 1, owner, 0, []])
            compareX4AutoValues(bobX4Auto, [3, 1, 1, owner, 0, [], []])

            const johnX3Auto = await contractInstance.getUserX3_Auto(john)
            const johnX4Auto = await contractInstance.getUserX4_Auto(john)
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
            const ownerX3Auto = await contractInstance.getUserX3_Auto(owner)
            const ownerX4Auto = await contractInstance.getUserX4_Auto(owner)
            compareX3AutoValues(ownerX3Auto, [1, 2, 0, ZERO_ADDRESS, 0, [alice, bob, john]])
            compareX4AutoValues(ownerX4Auto, [1, 1, 0, ZERO_ADDRESS, ether('0.025'), [alice, bob], [john]])

            const aliceX3Auto = await contractInstance.getUserX3_Auto(alice)
            const aliceX4Auto = await contractInstance.getUserX4_Auto(alice)
            compareX3AutoValues(aliceX3Auto, [2, 1, 1, owner, 0, []])
            compareX4AutoValues(aliceX4Auto, [2, 1, 1, owner, 0, [john], []])

            const bobX3Auto = await contractInstance.getUserX3_Auto(bob)
            const bobX4Auto = await contractInstance.getUserX4_Auto(bob)
            compareX3AutoValues(bobX3Auto, [3, 1, 1, owner, 0, []])
            compareX4AutoValues(bobX4Auto, [3, 1, 1, owner, 0, [], []])

            const johnX3Auto = await contractInstance.getUserX3_Auto(john)
            const johnX4Auto = await contractInstance.getUserX4_Auto(john)
            compareX3AutoValues(johnX3Auto, [4, 1, 1, owner, 0, []])
            compareX4AutoValues(johnX4Auto, [4, 1, 2, alice, 0, [], []])

            const tonyX3Auto = await contractInstance.getUserX3_Auto(tony)
            const tonyX4Auto = await contractInstance.getUserX4_Auto(tony)
            compareX3AutoValues(tonyX3Auto, [0, 0, 0, ZERO_ADDRESS, 0, []])
            compareX4AutoValues(tonyX4Auto, [0, 0, 0, ZERO_ADDRESS, 0, [], []])
        })
    })

    // describe('Loop of registrations', async () => {
    //     it('Register rest users', async function () {
    //         this.timeout(800000);
    //         for (let i = 5; i < accounts.length; i ++) {
    //             // Pre-payment values from contract
    //             const newUserId = (await contractInstance.autoSystemLastUserId.call()).toString()
    //             const { x3Upline, x4Upline } = await getUplines()

    //             const newAutoUser = {
    //                 id: newUserId,
    //                 addr: accounts[i - 1]
    //             }

    //             // Register user
    //             await contractInstance.registration(newAutoUser.addr, { from: accounts[i], value: REGISTRATION_FEE })
    //             console.log('#', newAutoUser.id, 'joined')

    //             // Validate user state after registration
    //             await userRegistrationChecks(newAutoUser.id, x3Upline, x4Upline, accounts[i - 1])

    //             // Validate X3 Upline
    //             await x3UplineChecks(x3Upline, newAutoUser)

    //             // Validate X4 Upline
    //             await x4UplineChecks(x4Upline, newAutoUser)

    //             console.log('------------------------')
    //         }
    //     })
    // })
})
