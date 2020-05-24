const Ponzy = artifacts.require('Ponzy.sol')
const { expectRevert } = require('openzeppelin-test-helpers')
const { REGISTRATION_FEE, LEVEL_2_FEE, LEVEL_3_FEE } = require('../constants')

contract('Ponzy - Buy levels checks', ([owner, alice, bob, max, ...accounts]) => {
    let contractInstance

    before(async () => {
        contractInstance = await Ponzy.deployed()
        await contractInstance.registration(owner, { from: alice, value: REGISTRATION_FEE })
        await contractInstance.registration(owner, { from: bob, value: REGISTRATION_FEE })
    })

    describe('Buy New Levels', async () => {
        const invalidAmount = web3.utils.toWei('0.00')
        const level0Amount = web3.utils.toWei('0')

        it('With invalid user. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(1, 2, { from: max, value: LEVEL_2_FEE }),
                'buyNewLevel: user is not exists'
            )
        })

        it('With invalid matrix. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(3, 2, { from: alice, value: LEVEL_2_FEE }),
                'buyNewLevel: invalid matrix'
            )
        })

        it('With invalid price. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(1, 2, { from: alice, value: invalidAmount }),
                'buyNewLevel: invalid price'
            )
        })

        it('With invalid level. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(1, 0, { from: alice, value: level0Amount }),
                'buyNewLevel: invalid level'
            )
        })

        it('Matrix x3 level 2', async () => {
            let isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 2)
            assert.equal(isUserActiveX3Level, false)

            await contractInstance.buyNewLevel(1, 2, { from: alice, value: LEVEL_2_FEE })

            isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 2)
            assert.equal(isUserActiveX3Level, true)

        })

        it('Matrix x3 level 3', async () => {
            let isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 3)
            assert.equal(isUserActiveX3Level, false)

            await contractInstance.buyNewLevel(1, 3, { from: alice, value: LEVEL_3_FEE })

            isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 3)
            assert.equal(isUserActiveX3Level, true)

        })

        it('Matrix x3 level 3', async () => {
            let isUserActiveX3Level = await contractInstance.usersActiveX3Levels(bob, 3)
            assert.equal(isUserActiveX3Level, false)

            await contractInstance.buyNewLevel(1, 3, { from: bob, value: LEVEL_3_FEE })

            isUserActiveX3Level = await contractInstance.usersActiveX3Levels(bob, 3)
            assert.equal(isUserActiveX3Level, true)

        })

        it('With x3 level already activated. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(1, 2, { from: alice, value: LEVEL_2_FEE }),
                '_buyNewLevel: level already activated'
            )
        })

        it('Matrix x4 level 2', async () => {
            let isUserActiveX4Level = await contractInstance.usersActiveX4Levels(alice, 2)
            assert.equal(isUserActiveX4Level, false)

            await contractInstance.buyNewLevel(2, 2, { from: alice, value: LEVEL_2_FEE })

            isUserActiveX4Level = await contractInstance.usersActiveX4Levels(alice, 2)
            assert.equal(isUserActiveX4Level, true)
        })

        it('Matrix x4 level 3', async () => {
            let isUserActiveX4Level = await contractInstance.usersActiveX4Levels(alice, 3)
            assert.equal(isUserActiveX4Level, false)

            await contractInstance.buyNewLevel(2, 3, { from: alice, value: LEVEL_3_FEE })

            isUserActiveX4Level = await contractInstance.usersActiveX4Levels(alice, 3)
            assert.equal(isUserActiveX4Level, true)
        })

        it('Matrix x4 level 3', async () => {
            let isUserActiveX4Level = await contractInstance.usersActiveX4Levels(bob, 3)
            assert.equal(isUserActiveX4Level, false)

            await contractInstance.buyNewLevel(2, 3, { from: bob, value: LEVEL_3_FEE })

            isUserActiveX4Level = await contractInstance.usersActiveX4Levels(bob, 3)
            assert.equal(isUserActiveX4Level, true)
        })

        it('With x4 level already activated. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(2, 2, { from: alice, value: LEVEL_2_FEE }),
                '_buyNewLevel: level already activated'
            )
        })
    })
})