const Ponzy = artifacts.require('Ponzy.sol')

module.exports = async (deployer, network, accounts) => {
    await deployer.deploy(Ponzy, accounts[0])
}