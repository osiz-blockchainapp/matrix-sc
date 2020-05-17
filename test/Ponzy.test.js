const assert = require('assert')
const { BN, time, constants, balance, ether, expectRevert } = require('openzeppelin-test-helpers')

const { MIN_TEST_USERS_COUNT } = require('../constants')

contract('Ponzi smart contract tests', (accounts) => {
    console.log(`${accounts.length} ETH accounts available for testing.`)

    if (accounts.length < MIN_TEST_USERS_COUNT) {
        console.log('Please increase test users count and try again!')
        return
    }

    const owner = accounts[0]
})
