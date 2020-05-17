const Ponzy = artifacts.require('Ponzy.sol')
const { expectRevert } = require('openzeppelin-test-helpers')

contract('Ponzy - Buy levels checks', ([owner, alice, bob, max, ...accounts]) => {
    let contractInstance

    before(async () => {
        contractInstance = await Ponzy.deployed()
        await contractInstance.registration(owner, { from: alice, value: 50000000000000000 })
        await contractInstance.registration(owner, { from: bob, value: 50000000000000000 })
    })

    describe('Buy New Levels', async () => {
        //levelPrice[1] = 0.025 ether
        const amount = '0.05'
        const level3amount = '0.1'
        const invalidAmount = '0.00'
        const level0Amount = '0'

        it('With invalid user. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(1, 2, { from: max, value: web3.utils.toWei(amount, "ether") }),
                'user is not exists. Register first.'
            )
        })

        it('With invalid matrix. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(3, 2, { from: alice, value: web3.utils.toWei(amount, "ether") }),
                'invalid matrix'
            )
        })

        it('With invalid price. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(1, 2, { from: alice, value: web3.utils.toWei( invalidAmount, "ether") }),
                'invalid price'
            )
        })

        it('With invalid level. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(1, 0, { from: alice, value: web3.utils.toWei(level0Amount, "ether") }),
                'invalid level'
            )
        })

        it('Matrix x3 level 2', async () => {
            let isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 2)
            assert.equal(isUserActiveX3Level, false)

            await contractInstance.buyNewLevel(1, 2, { from: alice, value: web3.utils.toWei(amount, "ether") })

            isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 2)
            assert.equal(isUserActiveX3Level, true)

        })

        it('Matrix x3 level 3', async () => {
            let isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 3)
            assert.equal(isUserActiveX3Level, false)

            await contractInstance.buyNewLevel(1, 3, { from: alice, value: web3.utils.toWei(level3amount, "ether") })

            isUserActiveX3Level = await contractInstance.usersActiveX3Levels(alice, 3)
            assert.equal(isUserActiveX3Level, true)

        })

        it('Matrix x3 level 3', async () => {
            let isUserActiveX3Level = await contractInstance.usersActiveX3Levels(bob, 3)
            assert.equal(isUserActiveX3Level, false)

            await contractInstance.buyNewLevel(1, 3, { from: bob, value: web3.utils.toWei(level3amount, "ether") })

            isUserActiveX3Level = await contractInstance.usersActiveX3Levels(bob, 3)
            assert.equal(isUserActiveX3Level, true)

        })

        it('With x3 level already activated. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(1, 2, { from: alice, value: web3.utils.toWei(amount, "ether") }),
                'level already activated'
            )
        })

        it('Matrix x6 level 2', async () => {
            const amount = '0.05'

            let isUserActiveX6Level = await contractInstance.usersActiveX6Levels(alice, 2)
            assert.equal(isUserActiveX6Level, false)

            await contractInstance.buyNewLevel(2, 2, { from: alice, value: web3.utils.toWei(amount, "ether") })

            isUserActiveX6Level = await contractInstance.usersActiveX6Levels(alice, 2)
            assert.equal(isUserActiveX6Level, true)
        })

        it('Matrix x6 level 3', async () => {
            let isUserActiveX6Level = await contractInstance.usersActiveX6Levels(alice, 3)
            assert.equal(isUserActiveX6Level, false)

            await contractInstance.buyNewLevel(2, 3, { from: alice, value: web3.utils.toWei(level3amount, "ether") })

            isUserActiveX6Level = await contractInstance.usersActiveX6Levels(alice, 3)
            assert.equal(isUserActiveX6Level, true)
        })

        it('Matrix x6 level 3', async () => {
            let isUserActiveX6Level = await contractInstance.usersActiveX6Levels(bob, 3)
            assert.equal(isUserActiveX6Level, false)

            await contractInstance.buyNewLevel(2, 3, { from: bob, value: web3.utils.toWei(level3amount, "ether") })

            isUserActiveX6Level = await contractInstance.usersActiveX6Levels(bob, 3)
            assert.equal(isUserActiveX6Level, true)
        })

        it('With x6 level already activated. Expect to throw', async () => {
            await expectRevert(
                contractInstance.buyNewLevel(2, 2, { from: alice, value: web3.utils.toWei(amount, "ether") }),
                'level already activated'
            )
        })
    })
})