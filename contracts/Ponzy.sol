pragma solidity ^0.5.0;

contract Ponzy {

    address public owner;
    uint256 public lastUserId = 2;
    uint8 public constant LAST_LEVEL = 12;

    struct User {
        uint256 id;
        address referrer;
        uint256 partnersCount;

        mapping(uint8 => bool) activeX3Levels;
        mapping(uint8 => bool) activeX4Levels;

        mapping(uint8 => X3) x3Matrix;
        mapping(uint8 => X4) x4Matrix;
    }

    struct X3 {
        address currentReferrer;
        address[] referrals;
        bool blocked;
        uint256 reinvestCount;
    }

    struct X4 {
        address currentReferrer;
        address[] firstLevelReferrals;
        address[] secondLevelReferrals;
        bool blocked;
        uint256 reinvestCount;

        address closedPart;
    }

    mapping(address => User) public users;
    mapping(uint256 => address) public idToAddress;
    mapping(uint256 => address) public userIds;
    mapping(address => uint256) public balances;
    mapping(uint8 => uint256) public levelPrice;

    event Registration(address indexed user, address indexed referrer, uint256 indexed userId, uint256 referrerId);
    event Reinvest(address indexed user, address indexed currentReferrer, address indexed caller, uint8 matrix, uint8 level);
    event Upgrade(address indexed user, address indexed referrer, uint8 matrix, uint8 level);
    event NewUserPlace(address indexed user, address indexed referrer, uint8 matrix, uint8 level, uint8 place);
    event MissedEthReceive(address indexed receiver, address indexed from, uint8 matrix, uint8 level);
    event SentExtraEthDividends(address indexed from, address indexed receiver, uint8 matrix, uint8 level);

    // -----------------------------------------
    // CONSTRUCTOR
    // -----------------------------------------

    constructor (address ownerAddress) public {
        require(ownerAddress != address(0), "constructor: owner address can not be 0x0 address");

        // SETUP LEVELS AND VALUES
        levelPrice[1] = 0.025 ether;
        levelPrice[2] = 0.05 ether;
        levelPrice[3] = 0.1 ether;
        levelPrice[4] = 0.2 ether;
        levelPrice[5] = 0.4 ether;
        levelPrice[6] = 0.8 ether;
        levelPrice[7] = 1.6 ether;
        levelPrice[8] = 3.2 ether;
        levelPrice[9] = 6.4 ether;
        levelPrice[10] = 12.8 ether;
        levelPrice[11] = 25.6 ether;
        levelPrice[12] = 51.2 ether;

        owner = ownerAddress;

        User memory user = User({
            id: 1,
            referrer: address(0),
            partnersCount: uint256(0)
        });

        users[ownerAddress] = user;
        idToAddress[1] = ownerAddress;

        for (uint8 i = 1; i <= LAST_LEVEL; i++) {
            users[ownerAddress].activeX3Levels[i] = true;
            users[ownerAddress].activeX4Levels[i] = true;
        }

        userIds[1] = ownerAddress;
    }

    // -----------------------------------------
    // FALLBACK
    // -----------------------------------------

    function () external payable {
        if(msg.data.length == 0) {
            return _registration(msg.sender, owner);
        }

        _registration(msg.sender, _bytesToAddress(msg.data));
    }

    // -----------------------------------------
    // SETTERS
    // -----------------------------------------

    function registration(address referrerAddress) external payable {
        _registration(msg.sender, referrerAddress);
    }

    function buyNewLevel(uint8 matrix, uint8 level) external payable {
        require(_isUserExists(msg.sender), "user is not exists. Register first.");
        require(matrix == 1 || matrix == 2, "invalid matrix");
        require(msg.value == levelPrice[level], "invalid price");
        require(level > 1 && level <= LAST_LEVEL, "invalid level");

        _buyNewLevel(matrix, level);
    }

    // -----------------------------------------
    // PRIVATE
    // -----------------------------------------

    function _registration(address userAddress, address referrerAddress) private {
        require(msg.value == 0.05 ether, "registration cost 0.05 ETH");
        require(!_isUserExists(userAddress), "user exists");
        require(_isUserExists(referrerAddress), "referrer not exists");

        uint32 size;
        assembly {
            size := extcodesize(userAddress)
        }
        require(size == 0, "cannot be a contract");

        User memory user = User({
            id: lastUserId,
            referrer: referrerAddress,
            partnersCount: 0
        });

        users[userAddress] = user;
        idToAddress[lastUserId] = userAddress;

        users[userAddress].referrer = referrerAddress;

        users[userAddress].activeX3Levels[1] = true;
        users[userAddress].activeX4Levels[1] = true;

        userIds[lastUserId] = userAddress;
        lastUserId++;

        users[referrerAddress].partnersCount++;

        address freeX3Referrer = _findFreeX3Referrer(userAddress, 1);
        users[userAddress].x3Matrix[1].currentReferrer = freeX3Referrer;

        _updateX3Referrer(userAddress, freeX3Referrer, 1);
        _updateX4Referrer(userAddress, _findFreeX4Referrer(userAddress, 1), 1);

        emit Registration(userAddress, referrerAddress, users[userAddress].id, users[referrerAddress].id);
    }

    function _buyNewLevel(uint8 matrix, uint8 level) private {
        if (matrix == 1) {
            require(!users[msg.sender].activeX3Levels[level], "level already activated");

            if (users[msg.sender].x3Matrix[level-1].blocked) {
                users[msg.sender].x3Matrix[level-1].blocked = false;
            }

            address freeX3Referrer = _findFreeX3Referrer(msg.sender, level);
            users[msg.sender].x3Matrix[level].currentReferrer = freeX3Referrer;
            users[msg.sender].activeX3Levels[level] = true;
            _updateX3Referrer(msg.sender, freeX3Referrer, level);

            emit Upgrade(msg.sender, freeX3Referrer, 1, level);
        } else {
            require(!users[msg.sender].activeX4Levels[level], "level already activated");

            if (users[msg.sender].x4Matrix[level-1].blocked) {
                users[msg.sender].x4Matrix[level-1].blocked = false;
            }

            address freeX4Referrer = _findFreeX4Referrer(msg.sender, level);

            users[msg.sender].activeX4Levels[level] = true;
            _updateX4Referrer(msg.sender, freeX4Referrer, level);

            emit Upgrade(msg.sender, freeX4Referrer, 2, level);
        }
    }

    function _updateX3Referrer(address userAddress, address referrerAddress, uint8 level) private {
        users[referrerAddress].x3Matrix[level].referrals.push(userAddress);

        if (users[referrerAddress].x3Matrix[level].referrals.length < 3) {
            emit NewUserPlace(userAddress, referrerAddress, 1, level, uint8(users[referrerAddress].x3Matrix[level].referrals.length));
            return _sendETHDividends(referrerAddress, userAddress, 1, level);
        }

        emit NewUserPlace(userAddress, referrerAddress, 1, level, 3);

        //close matrix
        users[referrerAddress].x3Matrix[level].referrals = new address[](0);

        if (!users[referrerAddress].activeX3Levels[level+1] && level != LAST_LEVEL) {
            users[referrerAddress].x3Matrix[level].blocked = true;
        }

        //create new one by recursion
        if (referrerAddress != owner) {
            //check referrer active level
            address freeReferrerAddress = _findFreeX3Referrer(referrerAddress, level);
            if (users[referrerAddress].x3Matrix[level].currentReferrer != freeReferrerAddress) {
                users[referrerAddress].x3Matrix[level].currentReferrer = freeReferrerAddress;
            }

            users[referrerAddress].x3Matrix[level].reinvestCount++;
            emit Reinvest(referrerAddress, freeReferrerAddress, userAddress, 1, level);

            _updateX3Referrer(referrerAddress, freeReferrerAddress, level);
        } else {
            _sendETHDividends(owner, userAddress, 1, level);
            users[owner].x3Matrix[level].reinvestCount++;

            emit Reinvest(owner, address(0), userAddress, 1, level);
        }
    }

    function _updateX4Referrer(address userAddress, address referrerAddress, uint8 level) private {
        require(users[referrerAddress].activeX4Levels[level], "500. Referrer level is inactive");

        // ADD 2ND PLACE OF FIRST LEVEL (3 members available)
        if (users[referrerAddress].x4Matrix[level].firstLevelReferrals.length < 2) {
            users[referrerAddress].x4Matrix[level].firstLevelReferrals.push(userAddress);
            emit NewUserPlace(userAddress, referrerAddress, 2, level, uint8(users[referrerAddress].x4Matrix[level].firstLevelReferrals.length));

            //set current level
            users[userAddress].x4Matrix[level].currentReferrer = referrerAddress;

            if (referrerAddress == owner) {
                return _sendETHDividends(referrerAddress, userAddress, 2, level);
            }

            address ref = users[referrerAddress].x4Matrix[level].currentReferrer;
            users[ref].x4Matrix[level].secondLevelReferrals.push(userAddress);

            uint256 len = users[ref].x4Matrix[level].firstLevelReferrals.length;

            if ((len == 2) &&
                (users[ref].x4Matrix[level].firstLevelReferrals[0] == referrerAddress) &&
                (users[ref].x4Matrix[level].firstLevelReferrals[1] == referrerAddress)) {
                if (users[referrerAddress].x4Matrix[level].firstLevelReferrals.length == 1) {
                    emit NewUserPlace(userAddress, ref, 2, level, 5);
                } else {
                    emit NewUserPlace(userAddress, ref, 2, level, 6);
                }
            }  else if ((len == 1 || len == 2) &&
                    users[ref].x4Matrix[level].firstLevelReferrals[0] == referrerAddress) {
                if (users[referrerAddress].x4Matrix[level].firstLevelReferrals.length == 1) {
                    emit NewUserPlace(userAddress, ref, 2, level, 3);
                } else {
                    emit NewUserPlace(userAddress, ref, 2, level, 4);
                }
            } else if (len == 2 && users[ref].x4Matrix[level].firstLevelReferrals[1] == referrerAddress) {
                if (users[referrerAddress].x4Matrix[level].firstLevelReferrals.length == 1) {
                    emit NewUserPlace(userAddress, ref, 2, level, 5);
                } else {
                    emit NewUserPlace(userAddress, ref, 2, level, 6);
                }
            }

            return _updateX4ReferrerSecondLevel(userAddress, ref, level);
        }

        users[referrerAddress].x4Matrix[level].secondLevelReferrals.push(userAddress);

        if (users[referrerAddress].x4Matrix[level].closedPart != address(0)) {
            if ((users[referrerAddress].x4Matrix[level].firstLevelReferrals[0] ==
                users[referrerAddress].x4Matrix[level].firstLevelReferrals[1]) &&
                (users[referrerAddress].x4Matrix[level].firstLevelReferrals[0] ==
                users[referrerAddress].x4Matrix[level].closedPart)) {

                _updateX4(userAddress, referrerAddress, level, true);
                return _updateX4ReferrerSecondLevel(userAddress, referrerAddress, level);
            } else if (users[referrerAddress].x4Matrix[level].firstLevelReferrals[0] ==
                users[referrerAddress].x4Matrix[level].closedPart) {
                _updateX4(userAddress, referrerAddress, level, true);
                return _updateX4ReferrerSecondLevel(userAddress, referrerAddress, level);
            } else {
                _updateX4(userAddress, referrerAddress, level, false);
                return _updateX4ReferrerSecondLevel(userAddress, referrerAddress, level);
            }
        }

        if (users[referrerAddress].x4Matrix[level].firstLevelReferrals[1] == userAddress) {
            _updateX4(userAddress, referrerAddress, level, false);
            return _updateX4ReferrerSecondLevel(userAddress, referrerAddress, level);
        } else if (users[referrerAddress].x4Matrix[level].firstLevelReferrals[0] == userAddress) {
            _updateX4(userAddress, referrerAddress, level, true);
            return _updateX4ReferrerSecondLevel(userAddress, referrerAddress, level);
        }

        if (users[users[referrerAddress].x4Matrix[level].firstLevelReferrals[0]].x4Matrix[level].firstLevelReferrals.length <=
            users[users[referrerAddress].x4Matrix[level].firstLevelReferrals[1]].x4Matrix[level].firstLevelReferrals.length) {
            _updateX4(userAddress, referrerAddress, level, false);
        } else {
            _updateX4(userAddress, referrerAddress, level, true);
        }

        _updateX4ReferrerSecondLevel(userAddress, referrerAddress, level);
    }

    function _updateX4(address userAddress, address referrerAddress, uint8 level, bool x2) private {
        if (!x2) {
            users[users[referrerAddress].x4Matrix[level].firstLevelReferrals[0]].x4Matrix[level].firstLevelReferrals.push(userAddress);

            emit NewUserPlace(userAddress, users[referrerAddress].x4Matrix[level].firstLevelReferrals[0], 2, level, uint8(users[users[referrerAddress].x4Matrix[level].firstLevelReferrals[0]].x4Matrix[level].firstLevelReferrals.length));
            emit NewUserPlace(userAddress, referrerAddress, 2, level, 2 + uint8(users[users[referrerAddress].x4Matrix[level].firstLevelReferrals[0]].x4Matrix[level].firstLevelReferrals.length));

            //set current level
            users[userAddress].x4Matrix[level].currentReferrer = users[referrerAddress].x4Matrix[level].firstLevelReferrals[0];
        } else {
            users[users[referrerAddress].x4Matrix[level].firstLevelReferrals[1]].x4Matrix[level].firstLevelReferrals.push(userAddress);

            emit NewUserPlace(userAddress, users[referrerAddress].x4Matrix[level].firstLevelReferrals[1], 2, level, uint8(users[users[referrerAddress].x4Matrix[level].firstLevelReferrals[1]].x4Matrix[level].firstLevelReferrals.length));
            emit NewUserPlace(userAddress, referrerAddress, 2, level, 4 + uint8(users[users[referrerAddress].x4Matrix[level].firstLevelReferrals[1]].x4Matrix[level].firstLevelReferrals.length));

            //set current level
            users[userAddress].x4Matrix[level].currentReferrer = users[referrerAddress].x4Matrix[level].firstLevelReferrals[1];
        }
    }

    function _updateX4ReferrerSecondLevel(address userAddress, address referrerAddress, uint8 level) private {
        if (users[referrerAddress].x4Matrix[level].secondLevelReferrals.length < 4) {
            return _sendETHDividends(referrerAddress, userAddress, 2, level);
        }

        address[] memory x4 = users[users[referrerAddress].x4Matrix[level].currentReferrer].x4Matrix[level].firstLevelReferrals;

        if (x4.length == 2) {
            if (x4[0] == referrerAddress ||
                x4[1] == referrerAddress) {
                users[users[referrerAddress].x4Matrix[level].currentReferrer].x4Matrix[level].closedPart = referrerAddress;
            }
        } else if (x4.length == 1) {
            if (x4[0] == referrerAddress) {
                users[users[referrerAddress].x4Matrix[level].currentReferrer].x4Matrix[level].closedPart = referrerAddress;
            }
        }

        users[referrerAddress].x4Matrix[level].firstLevelReferrals = new address[](0);
        users[referrerAddress].x4Matrix[level].secondLevelReferrals = new address[](0);
        users[referrerAddress].x4Matrix[level].closedPart = address(0);

        if (!users[referrerAddress].activeX4Levels[level+1] && level != LAST_LEVEL) {
            users[referrerAddress].x4Matrix[level].blocked = true;
        }

        users[referrerAddress].x4Matrix[level].reinvestCount++;

        if (referrerAddress != owner) {
            address freeReferrerAddress = _findFreeX4Referrer(referrerAddress, level);

            emit Reinvest(referrerAddress, freeReferrerAddress, userAddress, 2, level);
            _updateX4Referrer(referrerAddress, freeReferrerAddress, level);
        } else {
            emit Reinvest(owner, address(0), userAddress, 2, level);
            _sendETHDividends(owner, userAddress, 2, level);
        }
    }

    function _findEthReceiver(address userAddress, address _from, uint8 matrix, uint8 level) private returns (address, bool) {
        address receiver = userAddress;
        bool isExtraDividends;
        if (matrix == 1) {
            while (true) {
                if (users[receiver].x3Matrix[level].blocked) {
                    emit MissedEthReceive(receiver, _from, 1, level);
                    isExtraDividends = true;
                    receiver = users[receiver].x3Matrix[level].currentReferrer;
                } else {
                    return (receiver, isExtraDividends);
                }
            }
        } else {
            while (true) {
                if (users[receiver].x4Matrix[level].blocked) {
                    emit MissedEthReceive(receiver, _from, 2, level);
                    isExtraDividends = true;
                    receiver = users[receiver].x4Matrix[level].currentReferrer;
                } else {
                    return (receiver, isExtraDividends);
                }
            }
        }
    }

    function _sendETHDividends(address userAddress, address _from, uint8 matrix, uint8 level) private {
        (address receiver, bool isExtraDividends) = _findEthReceiver(userAddress, _from, matrix, level);

        address(uint160(receiver)).transfer(levelPrice[level]);

        if (isExtraDividends) {
            emit SentExtraEthDividends(_from, receiver, matrix, level);
        }
    }

    function _bytesToAddress(bytes memory bys) private pure returns (address addr) {
        assembly {
            addr := mload(add(bys, 20))
        }
    }

    function _findFreeX3Referrer(address userAddress, uint8 level) private view returns (address) {
        while (true) {
            if (users[users[userAddress].referrer].activeX3Levels[level]) {
                return users[userAddress].referrer;
            }

            userAddress = users[userAddress].referrer;
        }
    }

    function _findFreeX4Referrer(address userAddress, uint8 level) private view returns (address) {
        while (true) {
            if (users[users[userAddress].referrer].activeX4Levels[level]) {
                return users[userAddress].referrer;
            }

            userAddress = users[userAddress].referrer;
        }
    }

    function _isUserExists(address user) private view returns (bool) {
        return (users[user].id != 0);
    }

    // -----------------------------------------
    // GETTERS
    // -----------------------------------------

    function findFreeX3Referrer(address userAddress, uint8 level) external view returns (address) {
        return _findFreeX3Referrer(userAddress, level);
    }

    function findFreeX4Referrer(address userAddress, uint8 level) external view returns (address) {
        return _findFreeX4Referrer(userAddress, level);
    }

    function usersActiveX3Levels(address userAddress, uint8 level) external view returns (bool) {
        return users[userAddress].activeX3Levels[level];
    }

    function usersActiveX4Levels(address userAddress, uint8 level) external view returns (bool) {
        return users[userAddress].activeX4Levels[level];
    }

    function usersX3Matrix(address userAddress, uint8 level) external view returns (
        address currentReferrer,
        address[] memory referrals,
        bool blocked,
        uint256 reinvestCount
    ) {
        return (
            users[userAddress].x3Matrix[level].currentReferrer,
            users[userAddress].x3Matrix[level].referrals,
            users[userAddress].x3Matrix[level].blocked,
            users[userAddress].x3Matrix[level].reinvestCount
        );
    }

    function usersX4Matrix(address userAddress, uint8 level) external view returns (
        address currentReferrer,
        address[] memory firstLevelReferrals,
        address[] memory secondLevelReferrals,
        bool blocked,
        address closedPart,
        uint256 reinvestCount
    ) {
        return (
            users[userAddress].x4Matrix[level].currentReferrer,
            users[userAddress].x4Matrix[level].firstLevelReferrals,
            users[userAddress].x4Matrix[level].secondLevelReferrals,
            users[userAddress].x4Matrix[level].blocked,
            users[userAddress].x4Matrix[level].closedPart,
            users[userAddress].x3Matrix[level].reinvestCount
        );
    }

    function isUserExists(address user) external view returns (bool) {
        return _isUserExists(user);
    }
}

contract PonzyAuto {
    struct User {
        uint256 id;

        // Only the element will be used
        mapping(uint8 => X3_AUTO) x3Auto;
        mapping(uint8 => X4_AUTO) x4Auto;
    }

    struct X3_AUTO {
        uint8 level;
        uint256 upline_id;
        address upline;
        uint256 profit;
        address[] referrals;
    }

    struct X4_AUTO {
        uint8 level;
        uint256 upline_id;
        address upline;
        uint256 profit;
        address[] firstLevelReferrals;
        address[] secondLevelReferrals;
    }

    address payable public owner;
    uint256 public lastUserId = 2;

    mapping(address => User) public users;
    mapping(uint256 => address) public idToAddress;
    mapping(uint8 => uint256) public levelPrice;

    // -----------------------------------------
    // CONSTRUCTOR
    // -----------------------------------------

    constructor() public {
        levelPrice[1] = 0.025 ether;
        levelPrice[2] = 0.05 ether;
        levelPrice[3] = 0.1 ether;
        levelPrice[4] = 0.2 ether;
        levelPrice[5] = 0.4 ether;
        levelPrice[6] = 0.8 ether;
        levelPrice[7] = 1.6 ether;
        levelPrice[8] = 3.2 ether;
        levelPrice[9] = 6.4 ether;
        levelPrice[10] = 12.8 ether;
        levelPrice[11] = 25.6 ether;
        levelPrice[12] = 51.2 ether;

        owner = msg.sender;

        idToAddress[1] = owner;
        users[owner].id = 1;

        _x3AutoUpLevel(owner, 1);
        _x4AutoUpLevel(owner, 1);
    }

    // -----------------------------------------
    // FALLBACK
    // -----------------------------------------

    function () payable external {
        _register(msg.sender, msg.value);
    }

    // -----------------------------------------
    // SETTERS
    // -----------------------------------------

    function register() payable external {
        _register(msg.sender, msg.value);
    }

    function destruct() external {
        require(msg.sender == owner, "Access denied");
        selfdestruct(msg.sender);
    }

    // -----------------------------------------
    // PRIVATE
    // -----------------------------------------

    function _register(address user, uint256 value) private {
        require(user != owner, "Is owner");
        require(users[user].id == 0, "User already exists");

        // Get upline ID of user
        (address x3AutoUpline, address x4AutoUpline) = _detectUplinesAddresses(lastUserId + 1);

        // Create new user
        _newUser(user, x3AutoUpline, x4AutoUpline);

        // Increase level of user
        _x3AutoUpLevel(user, 1);
        _x4AutoUpLevel(user, 1);

        // Check the state and pay to uplines
        _x3AutouplinePay(value, x3AutoUpline);
        _x4AutouplinePay(value, x4AutoUpline);
    }

    function _newUser(address user, address x3AutoUpline, address x4AutoUpline) private {
        // Register x3Auto values
        users[user].x3Auto[0].upline = x3AutoUpline;
        users[user].x3Auto[0].upline_id = users[x3AutoUpline].id;

        // Add member to x3Auto upline referrals
        users[x3AutoUpline].x3Auto[0].referrals.push(user);

        // Register x4Auto values
        users[user].x4Auto[0].upline = x4AutoUpline;
        users[user].x4Auto[0].upline_id = users[x4AutoUpline].id;

        // Add member to x4Auto upline first referrals and second line referalls
        users[x4AutoUpline].x4Auto[0].firstLevelReferrals.push(user);
        users[users[x4AutoUpline].x4Auto[0].upline].x4Auto[0].secondLevelReferrals.push(user);

        idToAddress[lastUserId] = user;
        users[user].id = ++lastUserId;
    }

    function _x3AutoUpLevel(address user, uint8 level) private {
        users[user].x3Auto[0].level = level;
    }

    function _x4AutoUpLevel(address user, uint8 level) private {
        users[user].x4Auto[0].level = level;
    }

    function _x3AutouplinePay(uint256 value, address upline) private {
        // If upline not defined
        if (upline == address(0)) {
            return owner.transfer(value);
        }

        // Re-Invest check
        if (users[upline].x3Auto[0].referrals[2] == msg.sender && users[upline].x3Auto[0].referrals.length == 3) {
            // Transfer funds to upline of msg.senders' upline
            address reinvestReceiver = users[upline].x3Auto[0].upline == address(0) ? owner : users[upline].x3Auto[0].upline;
            _send(reinvestReceiver, value);
        } else {
            // Increase upgrade profit of users' upline
            users[upline].x3Auto[0].profit += value;

            // The limit, which needed to my upline for achieving a new level
            uint256 levelMaxCap = levelPrice[users[upline].x3Auto[0].level + 1];

            // If upline level limit reached
            if (users[upline].x3Auto[0].profit >= levelMaxCap) {
                users[upline].x3Auto[0].profit = 0;

                _x3AutoUpLevel(upline, users[upline].x3Auto[0].level + 1);
                _x3AutouplinePay(levelMaxCap, users[upline].x3Auto[0].upline);
            }
        }
    }

    function _x4AutouplinePay(uint256 value, address upline) private {
        // If upline not defined
        if (upline == address(0)) {
            return owner.transfer(value);
        }

        address reinvestReceiver = _getX4_AUTOReinvestReceiver(users[upline].id);
        
        bool isReinvest = users[users[upline].x4Auto[0].upline].x4Auto[0].secondLevelReferrals.length == 3 && users[users[upline].x4Auto[0].upline].x4Auto[0].secondLevelReferrals[2] == msg.sender;
        bool isEarning = users[users[upline].x4Auto[0].upline].x4Auto[0].secondLevelReferrals.length == 4 && users[users[upline].x4Auto[0].upline].x4Auto[0].secondLevelReferrals[3] == msg.sender;
        bool isUpgrade = users[users[upline].x4Auto[0].upline].x4Auto[0].secondLevelReferrals.length < 3 && users[users[upline].x4Auto[0].upline].x4Auto[0].firstLevelReferrals.length == 2;
        
        if (isReinvest) {
            _send(reinvestReceiver, value);
        } else if (isEarning) {
            _send(users[upline].x4Auto[0].upline, value);
        } else if (isUpgrade) {
            uint256 levelMaxCap = levelPrice[users[reinvestReceiver].x4Auto[0].level + 1];

            // If upline level limit reached
            if (users[reinvestReceiver].x4Auto[0].profit >= levelMaxCap) {
                users[reinvestReceiver].x4Auto[0].profit = 0;

                _x4AutoUpLevel(upline, users[upline].x3Auto[0].level + 1);
                _x4AutouplinePay(levelMaxCap, reinvestReceiver);
            }        
        }
    }

    function _detectUplinesAddresses(uint256 id) private view returns(address, address) {
        address x3AutoUplineAddress = owner;
        address x4AutoUplineAddress = owner;

        // If owner address required
        if (id == 1) return (x3AutoUplineAddress, x4AutoUplineAddress);

        // Get X3_AUTO upline
        if (id % 3 == 0)        x3AutoUplineAddress = idToAddress[id / 3];
        else if (id % 3 == 1)   x3AutoUplineAddress = idToAddress[(id - 1) / 3];
        else if (id % 3 == 2)   x3AutoUplineAddress = idToAddress[(id + 1) / 3];

        // Get X4_AUTO upline
        if (id % 2 == 0)        x4AutoUplineAddress = idToAddress[id / 2];
        else x4AutoUplineAddress =  x4AutoUplineAddress = idToAddress[(id - 1) / 2];

        return (
            x3AutoUplineAddress,
            x4AutoUplineAddress
        );
    }

    function _getX4_AUTOReinvestReceiver(uint256 id) private view returns (address) {
        if (id > 31) {
            uint256 reinvestReceiverId = id;

            for (uint8 i = 0; i < 3; i++) {
                if (reinvestReceiverId % 2 != 0) reinvestReceiverId -= 1;
                reinvestReceiverId /= 2;
            }

            return idToAddress[reinvestReceiverId];
        } else {
            return owner;
        }
    }

    function _send(address to, uint256 value) private {
        require(to != address(0), "Zero address");
        address(uint160(to)).transfer(value);
    }

    // -----------------------------------------
    // GETTERS
    // -----------------------------------------

    function getUserX3_AUTO(address user) external view returns (
        uint256 id,
        uint8 level,
        uint256 upline_id,
        address upline,
        uint256 profit,
        address[] memory referrals
    ) {
        return (
            users[user].id,
            users[user].x3Auto[0].level,
            users[user].x3Auto[0].upline_id,
            users[user].x3Auto[0].upline,
            users[user].x3Auto[0].profit,
            users[user].x3Auto[0].referrals
        );
    }
    
    function getUserX4_AUTO(address user) external view returns (
        uint256 id,
        uint8 level,
        uint256 upline_id,
        address upline,
        uint256 profit,
        address[] memory firstLevelReferrals,
        address[] memory secondLevelReferrals
    ) {
        return (
            users[user].id,
            users[user].x4Auto[0].level,
            users[user].x4Auto[0].upline_id,
            users[user].x4Auto[0].upline,
            users[user].x4Auto[0].profit,
            users[user].x4Auto[0].firstLevelReferrals,
            users[user].x4Auto[0].secondLevelReferrals
        );
    }
}