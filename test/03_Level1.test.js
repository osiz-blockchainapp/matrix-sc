const Ponzy = artifacts.require('Ponzy.sol')
const { expectEvent, expectRevert } = require('openzeppelin-test-helpers')

contract('Ponzy - Level 1 overflow tests', ([owner, alice, bob, ...accounts]) => {
    let contractInstance

    before(async () => {
        contractInstance = await Ponzy.deployed()
        await contractInstance.registration(owner, { from: alice, value: 50000000000000000 })
        await contractInstance.registration(alice, { from: bob, value: 50000000000000000 })
    })

    describe('Check User referred by user Matrix overflow at level 1', async () => {
        it('Check User Matrix ', async () => {
            const address = contractInstance.address
            const amount = '0.05'

            console.log("is User Active 10 :")

            let usersX6Matrix = await contractInstance.usersX6Matrix(owner, 1)
            console.log(`Owner X6 matrix:`)
            console.log(usersX6Matrix)
            usersX6Matrix = await contractInstance.usersX6Matrix(alice, 1)
            console.log(`Alice X6 matrix:`)
            console.log(usersX6Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[5], data: bob, gasLimit: 6721975, to: address, value: web3.utils.toWei(amount, "ether") })
            let userExists = await contractInstance.isUserExists(accounts[5])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            console.log("is User Active 11 :")
            console.log(" -------------------------------------------------")
            console.log(await web3.eth.getBalance(bob))

            usersX6Matrix = await contractInstance.usersX6Matrix(owner, 1)
            console.log(`Owner X6 matrix:`)
            console.log(usersX6Matrix)
            usersX6Matrix = await contractInstance.usersX6Matrix(alice, 1)
            console.log(`Alice X6 matrix:`)
            console.log(usersX6Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[10], data: bob, gasLimit: 6721975, to: address, value: web3.utils.toWei(amount, "ether") })
            userExists = await contractInstance.isUserExists(accounts[10])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            console.log("is User Active 12 :")
            console.log(" -------------------------------------------------")
            console.log(await web3.eth.getBalance(bob))


            usersX6Matrix = await contractInstance.usersX6Matrix(owner, 1)
            console.log(`Owner X6 matrix:`)
            console.log(usersX6Matrix)
            usersX6Matrix = await contractInstance.usersX6Matrix(alice, 1)
            console.log(`Alice X6 matrix:`)
            console.log(usersX6Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[11], data: bob, gasLimit: 6721975, to: address, value: web3.utils.toWei(amount, "ether") })
            userExists = await contractInstance.isUserExists(accounts[11])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            console.log("is User Active 13 :")
            console.log(" -------------------------------------------------")
            console.log(await web3.eth.getBalance(bob))

            usersX6Matrix = await contractInstance.usersX6Matrix(owner, 1)
            console.log(`Owner X6 matrix:`)
            console.log(usersX6Matrix)
            usersX6Matrix = await contractInstance.usersX6Matrix(alice, 1)
            console.log(`Alice X6 matrix:`)
            console.log(usersX6Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[12], data: bob, gasLimit: 6721975, to: address, value: web3.utils.toWei(amount, "ether") })
            userExists = await contractInstance.isUserExists(accounts[12])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            console.log("is User Active 14 :")
            console.log(" -------------------------------------------------")
            console.log(await web3.eth.getBalance(bob))

            usersX6Matrix = await contractInstance.usersX6Matrix(owner, 1)
            console.log(`Owner X6 matrix:`)
            console.log(usersX6Matrix)
            usersX6Matrix = await contractInstance.usersX6Matrix(alice, 1)
            console.log(`Alice X6 matrix:`)
            console.log(usersX6Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[13], data: bob, gasLimit: 6721975, to: address, value: web3.utils.toWei(amount, "ether") })
            userExists = await contractInstance.isUserExists(accounts[13])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            console.log("is User Active 15 :")
            console.log(" -------------------------------------------------")
            console.log(await web3.eth.getBalance(bob))

            usersX6Matrix = await contractInstance.usersX6Matrix(owner, 1)
            console.log(`Owner X6 matrix:`)
            console.log(usersX6Matrix)
            usersX6Matrix = await contractInstance.usersX6Matrix(alice, 1)
            console.log(`Alice X6 matrix:`)
            console.log(usersX6Matrix)

            //------------------------------------------------------------------ registration
            await contractInstance.sendTransaction({ from: accounts[14], data: bob, gasLimit: 6721975, to: address, value: web3.utils.toWei(amount, "ether") })
            userExists = await contractInstance.isUserExists(accounts[14])
            assert.equal(userExists, true)

            //assert.equal(isUserActiveX3Level, true)
            console.log("is User Active 16 :")
            console.log(" -------------------------------------------------")
            console.log(await web3.eth.getBalance(bob))

            usersX6Matrix = await contractInstance.usersX6Matrix(owner, 1)
            console.log(`Owner X6 matrix:`)
            console.log(usersX6Matrix)
            usersX6Matrix = await contractInstance.usersX6Matrix(alice, 1)
            console.log(`Alice X6 matrix:`)
            console.log(usersX6Matrix)
        })
    })
})