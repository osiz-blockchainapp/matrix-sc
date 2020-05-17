const Ponzy = artifacts.require('Ponzy.sol')
const { expectRevert } = require('openzeppelin-test-helpers')

contract('Ponzy - Overflow checks', ([owner, alice, bob, max, jhon,...accounts]) => {
    let amount
    let address
    let contractInstance

    before(async () => {
        contractInstance = await Ponzy.deployed()
        address = contractInstance.address
        amount =  web3.utils.toWei('0.05', 'ether')
    })

    describe('Check Owner Matrix overflow', async () => {
        it('Check Owner Matrix overflow', async () => {
            let isUserActiveX3Level = await contractInstance.usersActiveX3Levels(owner, 1)
            assert.equal(isUserActiveX3Level, true)

            let isUserActiveX6Level = await contractInstance.usersActiveX6Levels(owner, 1)
            assert.equal(isUserActiveX6Level, true)

            let usersX3Matrix = await contractInstance.usersX3Matrix(owner, 1)
            const ownerReferrer = usersX3Matrix['0']
            const ownerReferrals = usersX3Matrix['1']
            const isOwnerBlocked = usersX3Matrix['2']
            const ownerReinvestCount = usersX3Matrix['3'].toString()

            assert.equal(ownerReferrer, '0x0000000000000000000000000000000000000000')
            assert.equal(ownerReferrals.length, 0)
            assert.equal(isOwnerBlocked, false)
            assert.equal(ownerReinvestCount, '0')

            await contractInstance.sendTransaction({ from: accounts[5], data: owner, gasLimit: 6721975, to: address, value: amount })

            let userExists = await contractInstance.isUserExists(accounts[5])
            assert.equal(userExists, true)

            isUserActiveX3Level = await contractInstance.usersActiveX3Levels(owner, 1)
            assert.equal(isUserActiveX3Level, true)

            isUserActiveX6Level = await contractInstance.usersActiveX6Levels(owner, 1)
            assert.equal(isUserActiveX6Level, true)

            usersX3Matrix = await contractInstance.usersX3Matrix(owner, 1)
            await contractInstance.sendTransaction({ from: accounts[6], data: owner, gasLimit: 6721975, to: address, value: amount })

            userExists = await contractInstance.isUserExists(accounts[6])
            assert.equal(userExists, true)

            isUserActiveX3Level = await contractInstance.usersActiveX3Levels(owner, 1)
            assert.equal(isUserActiveX3Level, true)

            isUserActiveX6Level = await contractInstance.usersActiveX6Levels(owner, 1)
            assert.equal(isUserActiveX6Level, true)

            usersX3Matrix = await contractInstance.usersX3Matrix(owner, 1)
            await contractInstance.sendTransaction({ from: accounts[7], data: owner, gasLimit: 6721975, to: address, value: amount })

            userExists = await contractInstance.isUserExists(accounts[7])
            assert.equal(userExists, true)

            isUserActiveX3Level = await contractInstance.usersActiveX3Levels(owner, 1)
            assert.equal(isUserActiveX3Level, true)

            isUserActiveX6Level = await contractInstance.usersActiveX6Levels(owner, 1)
            assert.equal(isUserActiveX6Level, true)

            usersX3Matrix = await contractInstance.usersX3Matrix(owner, 1)
            await contractInstance.sendTransaction({ from: accounts[8], data: owner, gasLimit: 6721975, to: address, value: amount })

            userExists = await contractInstance.isUserExists(accounts[8])
            assert.equal(userExists, true)

            isUserActiveX3Level = await contractInstance.usersActiveX3Levels(owner, 1)
            assert.equal(isUserActiveX3Level, true)

            isUserActiveX6Level = await contractInstance.usersActiveX6Levels(owner, 1)
            assert.equal(isUserActiveX6Level, true)
        })
    })

    describe('Check User Matrix overflow', async () => {
        it('Check User Matrix ', async () => {
            await contractInstance.registration(owner, { from: alice, value: 50000000000000000 })

            let isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 1)
            assert.equal(isUserActiveX3Level, true)

            let isUserActiveX6Level = await contractInstance.usersActiveX6Levels(alice, 1)
            assert.equal(isUserActiveX6Level, true)

            // let usersX3Matrix = await contractInstance.usersX3Matrix(alice, 1)
            // let aliceX3Referrer = usersX3Matrix['0']
            // let aliceX3Referrals = usersX3Matrix['1']
            // let isAliceX3Blocked = usersX3Matrix['2']
            // let aliceX3ReinvestCount = usersX3Matrix['3'].toString()

            // assert.equal(aliceX3Referrer, owner)
            // assert.equal(aliceX3Referrals.length, 0)
            // assert.equal(isAliceX3Blocked, false)
            // assert.equal(aliceX3ReinvestCount, '0')

            // let usersX6Matrix = await contractInstance.usersX6Matrix(alice, 1)
            // let aliceX6Referrer = usersX6Matrix['0']
            // let aliceX6FirstLevelReferrals = usersX6Matrix['1']
            // let aliceX6SecondLevelReferrals = usersX6Matrix['2']
            // let isAliceX6Blocked = usersX6Matrix['3']
            // let isAliceX6ClosedPart = usersX6Matrix['4']
            // let aliceX6ReinvestCount = usersX6Matrix['5'].toString()

            // assert.equal(aliceX6Referrer, owner)
            // assert.equal(aliceX6FirstLevelReferrals.length, 0)
            // assert.equal(aliceX6SecondLevelReferrals.length, 0)
            // assert.equal(isAliceX6Blocked, false)
            // assert.equal(isAliceX6ClosedPart, '0x0000000000000000000000000000000000000000')
            // assert.equal(aliceX6ReinvestCount, '0')

            await contractInstance.sendTransaction({ from: accounts[9], data: alice, gasLimit: 6721975, to: address, value: amount })
            await contractInstance.sendTransaction({ from: accounts[10], data: alice, gasLimit: 6721975, to: address, value: amount })
            await contractInstance.sendTransaction({ from: accounts[11], data: alice, gasLimit: 6721975, to: address, value: amount })
            await contractInstance.sendTransaction({ from: accounts[12], data: alice, gasLimit: 6721975, to: address, value: amount })
            await contractInstance.sendTransaction({ from: accounts[13], data: alice, gasLimit: 6721975, to: address, value: amount })
            await contractInstance.sendTransaction({ from: accounts[14], data: alice, gasLimit: 6721975, to: address, value: amount })
        })
    })

    describe('Check Deep Gas Cost ', async () => {
        it('Gast Cost ', async () => {
            contractInstance = await Ponzy.new(owner)
            await contractInstance.registration(owner, { from: accounts[0], value: 50000000000000000 })

            try {
                for (let i= 1; i < accounts.length; i++ ) {
                    await contractInstance.registration(accounts[i - 1], { from: accounts[i], value: 50000000000000000 })
                }
            } catch (error) {
                console.log('ERROR found:', error)
            }

            await contractInstance.buyNewLevel(1, 2, { from: accounts[0], value: amount })
            await contractInstance.buyNewLevel(1, 2, { from: accounts[accounts.length-1], value: amount })
            await contractInstance.buyNewLevel(2, 2, { from: accounts[0], value: amount })
            await contractInstance.buyNewLevel(2, 2, { from: accounts[accounts.length-1], value: amount })
        })
    })
})