const Ponzy = artifacts.require('Ponzy.sol')
const { expectRevert } = require('openzeppelin-test-helpers')
const { REGISTRATION_FEE, ZERO_ADDRESS } = require('../constants')

contract('Ponzy - Registration checks', ([ owner, alice, bob, max, john, ...accounts ]) => {
    let contractInstance

    before(async () => {
        contractInstance = await Ponzy.deployed()
    })

    describe('Deployment', async () => {
        it('Deploys successfully', async () => {
            const address = contractInstance.address
            assert.notEqual(address, '')
            assert.notEqual(address, ZERO_ADDRESS)
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

            const isUserActiveX4Level = await contractInstance.usersActiveX4Levels(owner, 1)
            assert.equal(isUserActiveX4Level, true)
        })
    })

    describe('Register New User referred by owner', async () => {
        it('With invalid price. Expect to throw', async () => {
            await expectRevert(
                contractInstance.registration(owner, { from: alice }),
                '_registrationValidation: registration fee is not correct'
            )
        })

        it('With invalid referrer. Expect to throw', async () => {
            await expectRevert(
                contractInstance.registration(bob, { from: alice, value: REGISTRATION_FEE }),
                '_registrationValidation: referrer not exists'
            )
        })

        it('New user registered successfully', async () => {
            await contractInstance.registration(owner, { from: alice, value: REGISTRATION_FEE })

            const userExists = await contractInstance.isUserExists(alice)
            assert.equal(userExists, true)

            const isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 1)
            assert.equal(isUserActiveX3Level, true)

            const isUserActiveX4Level = await contractInstance.usersActiveX4Levels(alice, 1)
            assert.equal(isUserActiveX4Level, true)

            const addressReferred3x = await contractInstance.findFreeX3Referrer(alice, 1)
            assert.equal(addressReferred3x, owner)

            const addressReferred6x = await contractInstance.findFreeX4Referrer(alice, 1)
            assert.equal(addressReferred6x, owner)
        })

        it('With user registered. Expect to throw', async () => {
            await expectRevert(
                contractInstance.registration(owner, { from: alice, value: REGISTRATION_FEE  }),
                '_registrationValidation: user exists'
            )
        })
    })

    describe('Register New User referred by user', async () => {
        it('New user registered successfully', async () => {
            await contractInstance.registration(alice, { from: bob, value: REGISTRATION_FEE })

            const userExists = await contractInstance.isUserExists(bob)
            assert.equal(userExists, true)

            const isUserActiveX3Level = await contractInstance.usersActiveX3Levels(bob, 1)
            assert.equal(isUserActiveX3Level, true)

            const isUserActiveX4Level = await contractInstance.usersActiveX4Levels(bob, 1)
            assert.equal(isUserActiveX4Level, true)

            const addressReferred3x = await contractInstance.findFreeX3Referrer(bob, 1)
            assert.equal(addressReferred3x, alice)

            const addressReferred6x = await contractInstance.findFreeX4Referrer(bob, 1)
            assert.equal(addressReferred6x, alice)
        })
    })

    describe('Register New User by fallback function', async () => {
        it('New user registered successfully', async () => {
            const address = contractInstance.address

            await contractInstance.sendTransaction({ from: max, gasLimit: 6721975, to: address, value: REGISTRATION_FEE })

            const userExists = await contractInstance.isUserExists(max)
            assert.equal(userExists, true)

            const isUserActiveX3Level = await contractInstance.usersActiveX3Levels(max, 1)
            assert.equal(isUserActiveX3Level, true)

            const isUserActiveX4Level = await contractInstance.usersActiveX4Levels(max, 1)
            assert.equal(isUserActiveX4Level, true)

            const addressReferred3x = await contractInstance.findFreeX3Referrer(max, 1)
            assert.equal(addressReferred3x, owner)

            const addressReferred6x = await contractInstance.findFreeX4Referrer(max, 1)
            assert.equal(addressReferred6x, owner)
        })
    })

    describe('Register New User referred by user by fallback function', async () => {
        it('New user registered successfully', async () => {
            const address = contractInstance.address

            await contractInstance.sendTransaction({ from: john, data: alice, gasLimit: 6721975, to: address, value: REGISTRATION_FEE })

            const userExists = await contractInstance.isUserExists(john)
            assert.equal(userExists, true)

            const isUserActiveX3Level= await contractInstance.usersActiveX3Levels(john, 1)
            assert.equal(isUserActiveX3Level, true)

            const isUserActiveX4Level= await contractInstance.usersActiveX4Levels(john, 1)
            assert.equal(isUserActiveX4Level, true)

            const addressReferred3x = await contractInstance.findFreeX3Referrer(john, 1)
            assert.equal(addressReferred3x, alice)

            const addressReferred6x = await contractInstance.findFreeX4Referrer(john, 1)
            assert.equal(addressReferred6x, alice)
        })
    })
})