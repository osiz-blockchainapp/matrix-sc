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
        mapping(uint8 => bool) activeX6Levels;

        mapping(uint8 => X3) x3Matrix;
        mapping(uint8 => X6) x6Matrix;
    }

    struct X3 {
        address currentReferrer;
        address[] referrals;
        bool blocked;
        uint256 reinvestCount;
    }

    struct X6 {
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
            users[ownerAddress].activeX6Levels[i] = true;
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
        users[userAddress].activeX6Levels[1] = true;

        userIds[lastUserId] = userAddress;
        lastUserId++;

        users[referrerAddress].partnersCount++;

        address freeX3Referrer = _findFreeX3Referrer(userAddress, 1);
        users[userAddress].x3Matrix[1].currentReferrer = freeX3Referrer;

        _updateX3Referrer(userAddress, freeX3Referrer, 1);
        _updateX6Referrer(userAddress, _findFreeX6Referrer(userAddress, 1), 1);

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
            require(!users[msg.sender].activeX6Levels[level], "level already activated");

            if (users[msg.sender].x6Matrix[level-1].blocked) {
                users[msg.sender].x6Matrix[level-1].blocked = false;
            }

            address freeX6Referrer = _findFreeX6Referrer(msg.sender, level);

            users[msg.sender].activeX6Levels[level] = true;
            _updateX6Referrer(msg.sender, freeX6Referrer, level);

            emit Upgrade(msg.sender, freeX6Referrer, 2, level);
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

    function _updateX6Referrer(address userAddress, address referrerAddress, uint8 level) private {
        require(users[referrerAddress].activeX6Levels[level], "500. Referrer level is inactive");

        // ADD 2ND PLACE OF FIRST LEVEL (3 members available)
        if (users[referrerAddress].x6Matrix[level].firstLevelReferrals.length < 2) {
            users[referrerAddress].x6Matrix[level].firstLevelReferrals.push(userAddress);
            emit NewUserPlace(userAddress, referrerAddress, 2, level, uint8(users[referrerAddress].x6Matrix[level].firstLevelReferrals.length));

            //set current level
            users[userAddress].x6Matrix[level].currentReferrer = referrerAddress;

            if (referrerAddress == owner) {
                return _sendETHDividends(referrerAddress, userAddress, 2, level);
            }

            address ref = users[referrerAddress].x6Matrix[level].currentReferrer;
            users[ref].x6Matrix[level].secondLevelReferrals.push(userAddress);

            uint256 len = users[ref].x6Matrix[level].firstLevelReferrals.length;

            if ((len == 2) &&
                (users[ref].x6Matrix[level].firstLevelReferrals[0] == referrerAddress) &&
                (users[ref].x6Matrix[level].firstLevelReferrals[1] == referrerAddress)) {
                if (users[referrerAddress].x6Matrix[level].firstLevelReferrals.length == 1) {
                    emit NewUserPlace(userAddress, ref, 2, level, 5);
                } else {
                    emit NewUserPlace(userAddress, ref, 2, level, 6);
                }
            }  else if ((len == 1 || len == 2) &&
                    users[ref].x6Matrix[level].firstLevelReferrals[0] == referrerAddress) {
                if (users[referrerAddress].x6Matrix[level].firstLevelReferrals.length == 1) {
                    emit NewUserPlace(userAddress, ref, 2, level, 3);
                } else {
                    emit NewUserPlace(userAddress, ref, 2, level, 4);
                }
            } else if (len == 2 && users[ref].x6Matrix[level].firstLevelReferrals[1] == referrerAddress) {
                if (users[referrerAddress].x6Matrix[level].firstLevelReferrals.length == 1) {
                    emit NewUserPlace(userAddress, ref, 2, level, 5);
                } else {
                    emit NewUserPlace(userAddress, ref, 2, level, 6);
                }
            }

            return _updateX6ReferrerSecondLevel(userAddress, ref, level);
        }

        users[referrerAddress].x6Matrix[level].secondLevelReferrals.push(userAddress);

        if (users[referrerAddress].x6Matrix[level].closedPart != address(0)) {
            if ((users[referrerAddress].x6Matrix[level].firstLevelReferrals[0] ==
                users[referrerAddress].x6Matrix[level].firstLevelReferrals[1]) &&
                (users[referrerAddress].x6Matrix[level].firstLevelReferrals[0] ==
                users[referrerAddress].x6Matrix[level].closedPart)) {

                _updateX6(userAddress, referrerAddress, level, true);
                return _updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
            } else if (users[referrerAddress].x6Matrix[level].firstLevelReferrals[0] ==
                users[referrerAddress].x6Matrix[level].closedPart) {
                _updateX6(userAddress, referrerAddress, level, true);
                return _updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
            } else {
                _updateX6(userAddress, referrerAddress, level, false);
                return _updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
            }
        }

        if (users[referrerAddress].x6Matrix[level].firstLevelReferrals[1] == userAddress) {
            _updateX6(userAddress, referrerAddress, level, false);
            return _updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
        } else if (users[referrerAddress].x6Matrix[level].firstLevelReferrals[0] == userAddress) {
            _updateX6(userAddress, referrerAddress, level, true);
            return _updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
        }

        if (users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[0]].x6Matrix[level].firstLevelReferrals.length <=
            users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[1]].x6Matrix[level].firstLevelReferrals.length) {
            _updateX6(userAddress, referrerAddress, level, false);
        } else {
            _updateX6(userAddress, referrerAddress, level, true);
        }

        _updateX6ReferrerSecondLevel(userAddress, referrerAddress, level);
    }

    function _updateX6(address userAddress, address referrerAddress, uint8 level, bool x2) private {
        if (!x2) {
            users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[0]].x6Matrix[level].firstLevelReferrals.push(userAddress);

            emit NewUserPlace(userAddress, users[referrerAddress].x6Matrix[level].firstLevelReferrals[0], 2, level, uint8(users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[0]].x6Matrix[level].firstLevelReferrals.length));
            emit NewUserPlace(userAddress, referrerAddress, 2, level, 2 + uint8(users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[0]].x6Matrix[level].firstLevelReferrals.length));

            //set current level
            users[userAddress].x6Matrix[level].currentReferrer = users[referrerAddress].x6Matrix[level].firstLevelReferrals[0];
        } else {
            users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[1]].x6Matrix[level].firstLevelReferrals.push(userAddress);

            emit NewUserPlace(userAddress, users[referrerAddress].x6Matrix[level].firstLevelReferrals[1], 2, level, uint8(users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[1]].x6Matrix[level].firstLevelReferrals.length));
            emit NewUserPlace(userAddress, referrerAddress, 2, level, 4 + uint8(users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[1]].x6Matrix[level].firstLevelReferrals.length));

            //set current level
            users[userAddress].x6Matrix[level].currentReferrer = users[referrerAddress].x6Matrix[level].firstLevelReferrals[1];
        }
    }

    function _updateX6ReferrerSecondLevel(address userAddress, address referrerAddress, uint8 level) private {
        if (users[referrerAddress].x6Matrix[level].secondLevelReferrals.length < 4) {
            return _sendETHDividends(referrerAddress, userAddress, 2, level);
        }

        address[] memory x6 = users[users[referrerAddress].x6Matrix[level].currentReferrer].x6Matrix[level].firstLevelReferrals;

        if (x6.length == 2) {
            if (x6[0] == referrerAddress ||
                x6[1] == referrerAddress) {
                users[users[referrerAddress].x6Matrix[level].currentReferrer].x6Matrix[level].closedPart = referrerAddress;
            }
        } else if (x6.length == 1) {
            if (x6[0] == referrerAddress) {
                users[users[referrerAddress].x6Matrix[level].currentReferrer].x6Matrix[level].closedPart = referrerAddress;
            }
        }

        users[referrerAddress].x6Matrix[level].firstLevelReferrals = new address[](0);
        users[referrerAddress].x6Matrix[level].secondLevelReferrals = new address[](0);
        users[referrerAddress].x6Matrix[level].closedPart = address(0);

        if (!users[referrerAddress].activeX6Levels[level+1] && level != LAST_LEVEL) {
            users[referrerAddress].x6Matrix[level].blocked = true;
        }

        users[referrerAddress].x6Matrix[level].reinvestCount++;

        if (referrerAddress != owner) {
            address freeReferrerAddress = _findFreeX6Referrer(referrerAddress, level);

            emit Reinvest(referrerAddress, freeReferrerAddress, userAddress, 2, level);
            _updateX6Referrer(referrerAddress, freeReferrerAddress, level);
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
                if (users[receiver].x6Matrix[level].blocked) {
                    emit MissedEthReceive(receiver, _from, 2, level);
                    isExtraDividends = true;
                    receiver = users[receiver].x6Matrix[level].currentReferrer;
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

    function _findFreeX6Referrer(address userAddress, uint8 level) private view returns (address) {
        while (true) {
            if (users[users[userAddress].referrer].activeX6Levels[level]) {
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

    function findFreeX6Referrer(address userAddress, uint8 level) external view returns (address) {
        return _findFreeX6Referrer(userAddress, level);
    }

    function usersActiveX3Levels(address userAddress, uint8 level) external view returns (bool) {
        return users[userAddress].activeX3Levels[level];
    }

    function usersActiveX6Levels(address userAddress, uint8 level) external view returns (bool) {
        return users[userAddress].activeX6Levels[level];
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

    function usersX6Matrix(address userAddress, uint8 level) external view returns (
        address currentReferrer,
        address[] memory firstLevelReferrals,
        address[] memory secondLevelReferrals,
        bool blocked,
        address closedPart,
        uint256 reinvestCount
    ) {
        return (
            users[userAddress].x6Matrix[level].currentReferrer,
            users[userAddress].x6Matrix[level].firstLevelReferrals,
            users[userAddress].x6Matrix[level].secondLevelReferrals,
            users[userAddress].x6Matrix[level].blocked,
            users[userAddress].x6Matrix[level].closedPart,
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

        X3 x3;
        X4 x4;
    }

    struct X3 {
        uint8 level;
        uint256 upline_id;
        address upline;
        uint256 profit;
        address[] referrals;
    }

    struct X4 {
        uint8 level;
        uint256 upline_id;
        address upline;
        uint256 profit;
        address[] firstLevelReferrals;
        address[] secondLevelReferrals;
    }

    address payable public root;
    uint256 public last_id;

    uint256[] public levels;
    mapping(address => User) private users;
    mapping(uint256 => address) public users_ids;

    event Register(address indexed addr, address indexed x3Upline, address indexed x4Upline, uint256 id);
    event x3UpLevel(address indexed addr, uint8 level);
    event x4UpLevel(address indexed addr, uint8 level);
    event Profit(address indexed addr, address indexed referral, uint256 value);
    event Lost(address indexed addr, address indexed referral, uint256 value);

    // -----------------------------------------
    // CONSTRUCTOR
    // -----------------------------------------

    constructor() public {
        levels.push(0.025 ether);
        levels.push(0.05 ether);
        levels.push(0.1 ether);
        levels.push(0.2 ether);
        levels.push(0.4 ether);
        levels.push(0.8 ether);
        levels.push(1.6 ether);
        levels.push(3.2 ether);
        levels.push(6.4 ether);
        levels.push(12.8 ether);
        levels.push(25.6 ether);
        levels.push(51.2 ether);

        root = msg.sender;

        _newUser(root, address(0), address(0));
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
        require(msg.sender == root, "Access denied");
        selfdestruct(root);
    }

    // -----------------------------------------
    // PRIVATE
    // -----------------------------------------

    function _register(address user, uint256 value) private {
        require(value == levels[0] * 2, "Bad value");
        require(user != root, "Is root");
        require(users[user].id == 0, "User already exists");

        // Get upline ID of user
        (address x3Upline, address x4Upline) = _detectUplinesAddresses(last_id + 1);

        // Create new user
        _newUser(user, x3Upline, x4Upline);

        // Increase level of user
        _x3UpLevel(user, users[user].x3.level);
        _x4UpLevel(user, users[user].x4.level);

        // Check the state and pay to uplines
        _x3uplinePay(value, x3Upline);
        _x4uplinePay(value, x4Upline);
    }

    function _newUser(address user, address x3Upline, address x4Upline) private {
        users[user].id = ++last_id;
        users_ids[last_id] = user;

        if (last_id > 1) {
            // Register x3 values
            users[user].x3.upline = x3Upline;
            users[user].x3.upline_id = users[x3Upline].id;

            // Add member to x3 upline referrals
            users[x3Upline].x3.referrals.push(user);

            // Register x4 values
            users[user].x4.upline = x4Upline;
            users[user].x4.upline_id = users[x4Upline].id;

            // Add member to x4 upline first referrals and second line referalls
            users[x4Upline].x4.firstLevelReferrals.push(user);
            users[users[x4Upline].x4.upline].x4.secondLevelReferrals.push(user);
        }

        emit Register(user, x3Upline, x4Upline, last_id);
    }

    function _x3UpLevel(address user, uint8 level) private {
        users[user].x3.level = level;
        emit x3UpLevel(user, level);
    }

    function _x4UpLevel(address user, uint8 level) private {
        users[user].x4.level = level;
        emit x4UpLevel(user, level);
    }

    function _x3uplinePay(uint256 value, address upline) private {
        // If upline not defined
        if (upline == address(0)) {
            return root.transfer(value);
        }

        // Re-Invest check
        if (users[upline].x3.referrals[2] == msg.sender && users[upline].x3.referrals.length == 3) {
            // Transfer funds to upline of msg.senders' upline
            address reinvestReceiver = users[upline].x3.upline == address(0) ? root : users[upline].x3.upline;
            _send(reinvestReceiver, value);
        } else {
            // Increase upgrade profit of users' upline
            users[upline].x3.profit += value;

            // The limit, which needed to my upline for achieving a new level
            uint256 levelMaxCap = levels[users[upline].x3.level + 1];

            // If upline level limit reached
            if (users[upline].x3.profit >= levelMaxCap) {
                users[upline].x3.profit = 0;

                _x3UpLevel(upline, users[upline].x3.level + 1);
                _x3uplinePay(levelMaxCap, users[upline].x3.upline);
            }
        }
    }

    function _x4uplinePay(uint256 value, address upline) private {
        // If upline not defined
        if (upline == address(0)) {
            return root.transfer(value);
        }

        address reinvestReceiver = _getX4ReinvestReceiver(users[upline].id);
        
        bool isReinvest = users[users[upline].x4.upline].x4.secondLevelReferrals.length == 3 && users[users[upline].x4.upline].x4.secondLevelReferrals[2] == msg.sender;
        bool isEarning = users[users[upline].x4.upline].x4.secondLevelReferrals.length == 4 && users[users[upline].x4.upline].x4.secondLevelReferrals[3] == msg.sender;
        bool isUpgrade = users[users[upline].x4.upline].x4.secondLevelReferrals.length < 3 && users[users[upline].x4.upline].x4.firstLevelReferrals.length == 2;
        
        if (isReinvest) {
            _send(reinvestReceiver, value);
        } else if (isEarning) {
            _send(users[upline].x4.upline, value);
        } else if (isUpgrade) {
            uint256 levelMaxCap = levels[users[reinvestReceiver].x4.level + 1];

            // If upline level limit reached
            if (users[reinvestReceiver].x4.profit >= levelMaxCap) {
                users[reinvestReceiver].x4.profit = 0;

                _x4UpLevel(upline, users[upline].x3.level + 1);
                _x4uplinePay(levelMaxCap, reinvestReceiver);
            }        
        }
    }

    function _detectUplinesAddresses(uint256 id) private view returns(address, address) {
        address x3UplineAddress = root;
        address x4UplineAddress = root;

        // If root address required
        if (id == 1) return (x3UplineAddress, x4UplineAddress);

        // Get X3 upline
        if (id % 3 == 0)        x3UplineAddress = users_ids[id / 3];
        else if (id % 3 == 1)   x3UplineAddress = users_ids[(id - 1) / 3];
        else if (id % 3 == 2)   x3UplineAddress = users_ids[(id + 1) / 3];

        // Get X4 upline
        if (id % 2 == 0)        x4UplineAddress = users_ids[id / 2];
        else x4UplineAddress =  x4UplineAddress = users_ids[(id - 1) / 2];

        return (
            x3UplineAddress,
            x4UplineAddress
        );
    }

    function _getX4ReinvestReceiver(uint256 id) private view returns (address) {
        if (id > 31) {
            uint256 reinvestReceiverId = id;

            for (uint8 i = 0; i < 3; i++) {
                if (reinvestReceiverId % 2 != 0) reinvestReceiverId -= 1;
                reinvestReceiverId /= 2;
            }

            return users_ids[reinvestReceiverId];
        } else {
            return root;
        }
    }

    function _send(address to, uint256 value) private {
        require(to != address(0), "Zero address");
        address(uint160(to)).transfer(value);
    }

    // -----------------------------------------
    // GETTERS
    // -----------------------------------------

    function getUserX3(address user) external view returns (
        uint256 id,
        uint8 level,
        uint256 upline_id,
        address upline,
        uint256 profit,
        address[] memory referrals
    ) {
        return (
            users[user].id,
            users[user].x3.level,
            users[user].x3.upline_id,
            users[user].x3.upline,
            users[user].x3.profit,
            users[user].x3.referrals
        );
    }
    
    function getUserX4(address user) external view returns (
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
            users[user].x4.level,
            users[user].x4.upline_id,
            users[user].x4.upline,
            users[user].x4.profit,
            users[user].x4.firstLevelReferrals,
            users[user].x4.secondLevelReferrals
        );
    }
}