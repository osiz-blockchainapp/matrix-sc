const Voomo = artifacts.require('Voomo.sol')
const { expectEvent, expectRevert } = require('openzeppelin-test-helpers')
const { REGISTRATION_FEE, LEVEL_2_FEE, LEVEL_3_FEE, LEVEL_4_FEE } = require('../constants')

contract('Voomo - Level 4 overflow tests', ([owner, alice, bob, ...accounts]) => {
    let contractInstance

    before(async () => {
        contractInstance = await Voomo.deployed()
        await contractInstance.registration(owner, { from: alice, value: REGISTRATION_FEE })
        await contractInstance.registration(alice, { from: bob, value: REGISTRATION_FEE })

        await expectRevert(
            contractInstance.buyNewLevel(1, 4, { from: bob, value: LEVEL_4_FEE }),
            '_buyNewLevel: this level can not be bought'
        )
        await expectRevert(
            contractInstance.buyNewLevel(2, 4, { from: bob, value: LEVEL_4_FEE }),
            '_buyNewLevel: this level can not be bought'
        )
    })

    describe('Check User referred by user Matrix overflow at level 4', async () => {
        it('Check User Matrix ', async () => {
            const address = contractInstance.address

            // console.log("is User Active 10 :")

            let usersX4Matrix = await contractInstance.usersX4Matrix(owner, 4)
            // console.log(`Owner X4 matrix:`)
            // console.log(usersX4Matrix)
            usersX4Matrix = await contractInstance.usersX4Matrix(alice, 4)
            // console.log(`Alice X4 matrix:`)
            // console.log(usersX4Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[5], data: bob, gasLimit: 6721975, to: address, value: REGISTRATION_FEE })
            let userExists = await contractInstance.isUserExists(accounts[5])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            // console.log("is User Active 11 :")
            // console.log(" -------------------------------------------------")
            // console.log(await web3.eth.getBalance(bob))

            await contractInstance.buyNewLevel(1, 2, { from: accounts[5], value: LEVEL_2_FEE })
            await contractInstance.buyNewLevel(2, 2, { from: accounts[5], value: LEVEL_2_FEE })

            await contractInstance.buyNewLevel(1, 3, { from: accounts[5], value: LEVEL_3_FEE })
            await contractInstance.buyNewLevel(2, 3, { from: accounts[5], value: LEVEL_3_FEE })

            await contractInstance.buyNewLevel(1, 4, { from: accounts[5], value: LEVEL_4_FEE })
            await contractInstance.buyNewLevel(2, 4, { from: accounts[5], value: LEVEL_4_FEE })

            usersX4Matrix = await contractInstance.usersX4Matrix(owner, 4)
            // console.log(`Owner X4 matrix:`)
            // console.log(usersX4Matrix)
            usersX4Matrix = await contractInstance.usersX4Matrix(alice, 4)
            // console.log(`Alice X4 matrix:`)
            // console.log(usersX4Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[10], data: bob, gasLimit: 6721975, to: address, value: REGISTRATION_FEE })
            userExists = await contractInstance.isUserExists(accounts[10])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            // console.log("is User Active 12 :")
            // console.log(" -------------------------------------------------")
            // console.log(await web3.eth.getBalance(bob))

            await contractInstance.buyNewLevel(1, 2, { from: accounts[10], value: LEVEL_2_FEE })
            await contractInstance.buyNewLevel(2, 2, { from: accounts[10], value: LEVEL_2_FEE })

            await contractInstance.buyNewLevel(1, 3, { from: accounts[10], value: LEVEL_3_FEE })
            await contractInstance.buyNewLevel(2, 3, { from: accounts[10], value: LEVEL_3_FEE })

            await contractInstance.buyNewLevel(1, 4, { from: accounts[10], value: LEVEL_4_FEE })
            await contractInstance.buyNewLevel(2, 4, { from: accounts[10], value: LEVEL_4_FEE })


            usersX4Matrix = await contractInstance.usersX4Matrix(owner, 4)
            // console.log(`Owner X4 matrix:`)
            // console.log(usersX4Matrix)
            usersX4Matrix = await contractInstance.usersX4Matrix(alice, 4)
            // console.log(`Alice X4 matrix:`)
            // console.log(usersX4Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[11], data: bob, gasLimit: 6721975, to: address, value: REGISTRATION_FEE })
            userExists = await contractInstance.isUserExists(accounts[11])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            // console.log("is User Active 13 :")
            // console.log(" -------------------------------------------------")
            // console.log(await web3.eth.getBalance(bob))

            await contractInstance.buyNewLevel(1, 2, { from: accounts[11], value: LEVEL_2_FEE })
            await contractInstance.buyNewLevel(2, 2, { from: accounts[11], value: LEVEL_2_FEE })

            await contractInstance.buyNewLevel(1, 3, { from: accounts[11], value: LEVEL_3_FEE })
            await contractInstance.buyNewLevel(2, 3, { from: accounts[11], value: LEVEL_3_FEE })

            await contractInstance.buyNewLevel(1, 4, { from: accounts[11], value: LEVEL_4_FEE })
            await contractInstance.buyNewLevel(2, 4, { from: accounts[11], value: LEVEL_4_FEE })

            usersX4Matrix = await contractInstance.usersX4Matrix(owner, 4)
            // console.log(`Owner X4 matrix:`)
            // console.log(usersX4Matrix)
            usersX4Matrix = await contractInstance.usersX4Matrix(alice, 4)
            // console.log(`Alice X4 matrix:`)
            // console.log(usersX4Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[12], data: bob, gasLimit: 6721975, to: address, value: REGISTRATION_FEE })
            userExists = await contractInstance.isUserExists(accounts[12])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            // console.log("is User Active 14 :")
            // console.log(" -------------------------------------------------")
            // console.log(await web3.eth.getBalance(bob))

            await contractInstance.buyNewLevel(1, 2, { from: accounts[12], value: LEVEL_2_FEE })
            await contractInstance.buyNewLevel(2, 2, { from: accounts[12], value: LEVEL_2_FEE })

            await contractInstance.buyNewLevel(1, 3, { from: accounts[12], value: LEVEL_3_FEE })
            await contractInstance.buyNewLevel(2, 3, { from: accounts[12], value: LEVEL_3_FEE })

            await contractInstance.buyNewLevel(1, 4, { from: accounts[12], value: LEVEL_4_FEE })
            await contractInstance.buyNewLevel(2, 4, { from: accounts[12], value: LEVEL_4_FEE })

            usersX4Matrix = await contractInstance.usersX4Matrix(owner, 4)
            // console.log(`Owner X4 matrix:`)
            // console.log(usersX4Matrix)
            usersX4Matrix = await contractInstance.usersX4Matrix(alice, 4)
            // console.log(`Alice X4 matrix:`)
            // console.log(usersX4Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[13], data: bob, gasLimit: 6721975, to: address, value: REGISTRATION_FEE })
            userExists = await contractInstance.isUserExists(accounts[13])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            // console.log("is User Active 15 :")
            // console.log(" -------------------------------------------------")
            // console.log(await web3.eth.getBalance(bob))

            await contractInstance.buyNewLevel(1, 2, { from: accounts[13], value: LEVEL_2_FEE })
            await contractInstance.buyNewLevel(2, 2, { from: accounts[13], value: LEVEL_2_FEE })

            await contractInstance.buyNewLevel(1, 3, { from: accounts[13], value: LEVEL_3_FEE })
            await contractInstance.buyNewLevel(2, 3, { from: accounts[13], value: LEVEL_3_FEE })

            await contractInstance.buyNewLevel(1, 4, { from: accounts[13], value: LEVEL_4_FEE })
            await contractInstance.buyNewLevel(2, 4, { from: accounts[13], value: LEVEL_4_FEE })

            usersX4Matrix = await contractInstance.usersX4Matrix(owner, 4)
            // console.log(`Owner X4 matrix:`)
            // console.log(usersX4Matrix)
            usersX4Matrix = await contractInstance.usersX4Matrix(alice, 4)
            // console.log(`Alice X4 matrix:`)
            // console.log(usersX4Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[14], data: bob, gasLimit: 6721975, to: address, value: REGISTRATION_FEE })
            userExists = await contractInstance.isUserExists(accounts[14])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            // console.log("is User Active 16 :")
            // console.log(" -------------------------------------------------")
            // console.log(await web3.eth.getBalance(bob))

            await contractInstance.buyNewLevel(1, 2, { from: accounts[14], value: LEVEL_2_FEE })
            await contractInstance.buyNewLevel(2, 2, { from: accounts[14], value: LEVEL_2_FEE })

            await contractInstance.buyNewLevel(1, 3, { from: accounts[14], value: LEVEL_3_FEE })
            await contractInstance.buyNewLevel(2, 3, { from: accounts[14], value: LEVEL_3_FEE })

            await contractInstance.buyNewLevel(1, 4, { from: accounts[14], value: LEVEL_4_FEE })
            await contractInstance.buyNewLevel(2, 4, { from: accounts[14], value: LEVEL_4_FEE })

            usersX4Matrix = await contractInstance.usersX4Matrix(owner, 4)
            // console.log(`Owner X4 matrix:`)
            // console.log(usersX4Matrix)
            usersX4Matrix = await contractInstance.usersX4Matrix(alice, 4)
            // console.log(`Alice X4 matrix:`)
            // console.log(usersX4Matrix)
        })
    })
})
