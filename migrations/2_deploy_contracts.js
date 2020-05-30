const Voomo = artifacts.require('Voomo.sol')

module.exports = async (deployer, network, accounts) => {
    return deployer.deploy(Voomo, accounts[0])
}