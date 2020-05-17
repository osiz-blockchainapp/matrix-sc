const Ponzy = artifacts.require('Ponzy.sol')
const { expectRevert } = require('openzeppelin-test-helpers')

contract('Ponzy - Registration checks', ([ owner, alice, bob, max, john, ...accounts ]) => {
    let contractInstance

    before(async () => {
        contractInstance = await Ponzy.deployed()
    })

    describe('Deployment', async () => {
        it('Deploys successfully', async () => {
            const address = contractInstance.address
            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })
    })

    describe('Added Owner', async () => {
        it('Owner added successfully', async () => {
            const userExists = await contractInstance.isUserExists(owner)
            assert.equal(userExists, true)

            const isUserActiveX3Level = await contractInstance.usersActiveX3Levels(owner, 1)
            assert.equal(isUserActiveX3Level, true)

            const isUserActiveX6Level = await contractInstance.usersActiveX6Levels(owner, 1)
            assert.equal(isUserActiveX6Level, true)
        })
    })

    describe('Register New User referred by owner', async () => {
        it('With invalid price. Expect to throw', async () => {
            await expectRevert(
                contractInstance.registration(owner, { from: alice }),
                'registration cost 0.05 ETH'
            )
        })

        it('With invalid referrer. Expect to throw', async () => {
            await expectRevert(
                contractInstance.registration(bob, { from: alice, value: 50000000000000000 }),
                'referrer not exists'
            )
        })

        it('New user registered successfully', async () => {
            await contractInstance.registration(owner, { from: alice, value: 50000000000000000 })

            const userExists = await contractInstance.isUserExists(alice)
            assert.equal(userExists, true)

            const isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 1)
            assert.equal(isUserActiveX3Level, true)

            const isUserActiveX6Level = await contractInstance.usersActiveX6Levels(alice, 1)
            assert.equal(isUserActiveX6Level, true)

            const addressReferred3x = await contractInstance.findFreeX3Referrer(alice, 1)
            assert.equal(addressReferred3x, owner)

            const addressReferred6x = await contractInstance.findFreeX6Referrer(alice, 1)
            assert.equal(addressReferred6x, owner)
        })

        it('With user registered. Expect to throw', async () => {
            await expectRevert(
                contractInstance.registration(owner, { from: alice, value: 50000000000000000  }),
                'user exists'
            )
        })
    })

    describe('Register New User referred by user', async () => {
        it('New user registered successfully', async () => {
            await contractInstance.registration(alice, { from: bob, value: 50000000000000000 })

            const userExists = await contractInstance.isUserExists(bob)
            assert.equal(userExists, true)

            const isUserActiveX3Level = await contractInstance.usersActiveX3Levels(bob, 1)
            assert.equal(isUserActiveX3Level, true)

            const isUserActiveX6Level = await contractInstance.usersActiveX6Levels(bob, 1)
            assert.equal(isUserActiveX6Level, true)

            const addressReferred3x = await contractInstance.findFreeX3Referrer(bob, 1)
            assert.equal(addressReferred3x, alice)

            const addressReferred6x = await contractInstance.findFreeX6Referrer(bob, 1)
            assert.equal(addressReferred6x, alice)
        })
    })

    describe('Register New User by fallback function', async () => {
        it('New user registered successfully', async () => {
            const amount = web3.utils.toWei('0.05', 'ether')
            const address = contractInstance.address

            await contractInstance.sendTransaction({ from: max, gasLimit: 6721975, to: address, value: amount })

            const userExists = await contractInstance.isUserExists(max)
            assert.equal(userExists, true)

            const isUserActiveX3Level = await contractInstance.usersActiveX3Levels(max, 1)
            assert.equal(isUserActiveX3Level, true)

            const isUserActiveX6Level = await contractInstance.usersActiveX6Levels(max, 1)
            assert.equal(isUserActiveX6Level, true)

            const addressReferred3x = await contractInstance.findFreeX3Referrer(max, 1)
            assert.equal(addressReferred3x, owner)

            const addressReferred6x = await contractInstance.findFreeX6Referrer(max, 1)
            assert.equal(addressReferred6x, owner)
        })
    })

    describe('Register New User referred by user by fallback function', async () => {
        it('New user registered successfully', async () => {
            const amount = web3.utils.toWei('0.05', 'ether')
            const address = contractInstance.address

            await contractInstance.sendTransaction({ from: john, data: alice, gasLimit: 6721975, to: address, value: amount })

            const userExists = await contractInstance.isUserExists(john)
            assert.equal(userExists, true)

            const isUserActiveX3Level= await contractInstance.usersActiveX3Levels(john, 1)
            assert.equal(isUserActiveX3Level, true)

            const isUserActiveX6Level= await contractInstance.usersActiveX6Levels(john, 1)
            assert.equal(isUserActiveX6Level, true)

            const addressReferred3x = await contractInstance.findFreeX3Referrer(john, 1)
            assert.equal(addressReferred3x, alice)

            const addressReferred6x = await contractInstance.findFreeX6Referrer(john, 1)
            assert.equal(addressReferred6x, alice)
        })
    })
})