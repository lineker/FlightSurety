pragma solidity >=0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    mapping(address => uint256) private authorizedContracts;

    struct Airline {
        bool isRegistered;
        bool isActive;
        uint256 fund;
    }

    address[] public airlineAccts = new address[](0);
    mapping(address => Airline) private airlines;

    struct Passenger {
        address passengerWallet;
        mapping(string => uint256) boughtFlight;
        uint256 credit;

    }
    mapping(address => Passenger) private passengers;
    address[] public passengerAddresses;

    uint256 public constant INSURANCE_PRICE_LIMIT = 1 ether;

    // Implemented voting mechanism bases on multi-party consensus
    uint256 private constant VOTING_THRESHOLD = 50;  

    uint256 public constant MINIMUM_FUNDS = 10 ether;

    uint8 private constant MULTIPARTY_MIN_AIRLINES = 4;

    // new airlines adddress => approving addresses[]
    mapping(address => address[]) private multiCallsConsensus;
    event VoteCast(uint PercentageAirlinesAgreed, uint numberAgreedAirlines, uint numberTotalAirlines, address[] airlineAccts);
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        authorizedContracts[msg.sender] = 1;
        airlines[contractOwner] = Airline({isRegistered: true, isActive: true, fund: 0});
        // airlines[parseAddr("0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0")] = Airline({isRegistered: true, isActive: true, fund: 0});
        airlineAccts.push(contractOwner);
    }

    function parseAddr(string memory _a) internal pure returns (address _parsedAddress) {
        bytes memory tmp = bytes(_a);
        uint160 iaddr = 0;
        uint160 b1;
        uint160 b2;
        for (uint i = 2; i < 2 + 2 * 20; i += 2) {
            iaddr *= 256;
            b1 = uint160(uint8(tmp[i]));
            b2 = uint160(uint8(tmp[i + 1]));
            if ((b1 >= 97) && (b1 <= 102)) {
                b1 -= 87;
            } else if ((b1 >= 65) && (b1 <= 70)) {
                b1 -= 55;
            } else if ((b1 >= 48) && (b1 <= 57)) {
                b1 -= 48;
            }
            if ((b2 >= 97) && (b2 <= 102)) {
                b2 -= 87;
            } else if ((b2 >= 65) && (b2 <= 70)) {
                b2 -= 55;
            } else if ((b2 >= 48) && (b2 <= 57)) {
                b2 -= 48;
            }
            iaddr += (b1 * 16 + b2);
        }
        return address(iaddr);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireRegisteredAirline()
    {
        require(airlines[msg.sender].isRegistered || msg.sender == contractOwner, "Caller is not a registered airline");
        _;
    }

    modifier requireActiveAirline()
    {
        //require(airlines[msg.sender].isActive || msg.sender == contractOwner, "Caller is not a active airline");
        _;
    }

    modifier requireIsCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not an authorized contract");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external 
                            requireContractOwner
    {
        require(mode != operational, "New mode must be diffrent from existant mode");
        
        operational = mode;
    }

    function authorizeCaller
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

     function isAuthorized
                            (
                                address contractAddress
                            )
                            external
                            view
                            returns(bool)
    {
        return(authorizedContracts[contractAddress] == 1);
    }

    function deauthorizeCaller
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

    function ValidateMultSig(address subject) internal returns(bool)
    {
        if(airlineAccts.length < MULTIPARTY_MIN_AIRLINES)
        {
            return true;
        }

        if(multiCallsConsensus[subject].length == 0)
        {
            multiCallsConsensus[subject] = new address[](0);
        }

        bool isDuplicate = false;
        for(uint c=0; c<multiCallsConsensus[subject].length; c++) {
            if (multiCallsConsensus[subject][c] == msg.sender) {
                isDuplicate = true;
                break;
            }
        }
        require(!isDuplicate, "Caller has already called this function.");

        multiCallsConsensus[subject].push(msg.sender);

        uint256 numberAgreedAirlines = multiCallsConsensus[subject].length;
        uint256 numberTotalAirlines = airlineAccts.length;
        uint256 PercentageAirlinesAgreed = numberAgreedAirlines.mul(100).div(numberTotalAirlines);
        emit VoteCast(PercentageAirlinesAgreed, numberAgreedAirlines, numberTotalAirlines, airlineAccts);

        if (PercentageAirlinesAgreed >= VOTING_THRESHOLD) {
            delete multiCallsConsensus[subject]; 
            return true;      
        }  

        return false;
    }


    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (
                                address account
                            )
                            external
                            requireIsOperational
                            requireActiveAirline
                            returns(bool)
    {
        require(airlines[account].isActive == false, "Airline is already registered and Active");

        bool approved = ValidateMultSig(account);

        if(!approved) {
            return false;
        } 

        airlines[account] = Airline({isRegistered: true, isActive: false, fund: 0});                 
        airlineAccts.push(account);

        return true;
    }

    /**
    * @dev Gets the amount of airlines already registered
    */    
    function numberRegisteredAirlines() external view returns(uint256) {
        uint256 lengthAirlineArray = airlineAccts.length;
        return lengthAirlineArray;
    }

    /**
    * @dev Gets specific element / address from airlines mapping!
    */    

    function getAirlines() external view requireIsOperational returns(address[] memory) {
        return airlineAccts;
    }

    function getOwner() external view returns(address) {
        return contractOwner;
    }

    function isAirline (
                            address account
                        )
                        external
                        view
                        returns (bool) {
        return airlines[account].isRegistered;

    }

    function isAirlineActive (
                            address account
                        )
                        external
                        view
                        returns (bool) {
        return airlines[account].isActive;
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (      
                                string flightCode            
                            )
                            external
                            payable
                            requireIsOperational
                            returns (uint256, address, uint256)
    {
        require(msg.sender == tx.origin, "Contracts not allowed");
        require(msg.value > 0, 'You need to pay something to buy a flight insurance');

        if(!checkIfContains(msg.sender)){
            passengerAddresses.push(msg.sender);
        }

        if (passengers[msg.sender].passengerWallet != msg.sender) {
            passengers[msg.sender] = Passenger({
                                                passengerWallet: msg.sender,
                                                credit: 0
                                        });
            passengers[msg.sender].boughtFlight[flightCode] = msg.value;
        } else {
            passengers[msg.sender].boughtFlight[flightCode] = msg.value;
        }
        if (msg.value > INSURANCE_PRICE_LIMIT) {
            msg.sender.transfer(msg.value.sub(INSURANCE_PRICE_LIMIT));
        }
    }

    function checkIfContains(address passenger) internal view returns(bool inList){
        inList = false;
        for (uint256 c = 0; c < passengerAddresses.length; c++) {
            if (passengerAddresses[c] == passenger) {
                inList = true;
                break;
            }
        }
        return inList;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    string flightCode
                                )
                                external
                                requireIsOperational
    {
        for (uint256 c = 0; c < passengerAddresses.length; c++) {
            if(passengers[passengerAddresses[c]].boughtFlight[flightCode] != 0) {
                uint256 savedCredit = passengers[passengerAddresses[c]].credit;
                uint256 payedPrice = passengers[passengerAddresses[c]].boughtFlight[flightCode];
                passengers[passengerAddresses[c]].boughtFlight[flightCode] = 0;
                passengers[passengerAddresses[c]].credit = savedCredit + payedPrice + payedPrice.div(2);
            }
        }
    }
    
    function getCreditToPay() external view returns (uint256) {
        return passengers[msg.sender].credit;
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function withdraw
                            (
                                address insuredPassenger
                            )
                            external
                            requireIsOperational
                            returns (uint256, uint256, uint256, uint256, address, address)
    {
        require(insuredPassenger == tx.origin, "Contracts not allowed");
        require(passengers[insuredPassenger].credit > 0, "The company didn't put any money to be withdrawed by you");
        uint256 initialBalance = address(this).balance;
        uint256 credit = passengers[insuredPassenger].credit;
        require(address(this).balance > credit, "The contract does not have enough funds to pay the credit");
        passengers[insuredPassenger].credit = 0;
        insuredPassenger.transfer(credit);
        uint256 finalCredit = passengers[insuredPassenger].credit;
        return (initialBalance, credit, address(this).balance, finalCredit, insuredPassenger, address(this));
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract    should be self-sustaining
       */   
    function fund
                            (
                                address account
                            )
                            public
                            payable
    {
        uint256 currentFunds = airlines[account].fund;
        airlines[account].fund = currentFunds.add(msg.value);

        if(airlines[account].fund >= MINIMUM_FUNDS)
        {
            airlines[account].isActive = true;
        }
        
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        //fund();
    }


}
