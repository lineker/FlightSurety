pragma solidity  >=0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                          // Account used to deploy contract
    bool private operational = true;                        // Blocks all state changes throughout the contract if false
    
    struct Airline {
        bool isRegistered;
        bool isActive;              //true if registered airline submits funding of 10 ether
        address addressAirline;
        string airlineName;
        uint256 fund;
    }
    mapping(address => Airline) private airlines;
    
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    mapping(bytes32 => Flight) private flights;
	mapping(address => uint256) private authorizedContracts;
    
    address[] public airlineAccts = new address[](0); 

    address fundAddress;
    
    // Implemented voting mechanism bases on multi-party consensus
    uint256 private constant VOTING_THRESHOLD = 50;                                          

	// M = number of required addresses for consensus
    uint256 constant M = 2;                  
    
    // Array of addresses to prevent multiple calls of the same address (short array only --> lockout bug thru gaslimit!)
    address[] multiCalls = new address[](0);                            

	// 600 = 10*60 seconds, meaning min 10 minutes between two function calls when buying!
    //uint256 buyLimit = 600;                                            
    uint256 private enabled = block.timestamp; // "Timer"-variable for Rate Limiting modifier
    
    // 600 = 10*60 seconds, meaning min 10 minutes between two function calls when paying insurees!
    uint256 payoutLimit = 600;                                          
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
        authorizedContracts[contractOwner] = 1;
    }
    
     /**
    * @dev Event to signal the change of the state of the contract
    */
    event StateChanged(bool mode, string Reason);

    event EtherDataContract(uint etherContract, uint rAmount);

    /**
    * @dev Event to signal the change of the state of the contract
    */
    event PAirlinesAgreed(
        uint256 PercentageAirlinesAgreed, 
        uint256 numberAgreedAirlines, 
        uint256 numberTotalAirlines,
        address[] registeredAirlines
        );

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
    
    modifier requireIsCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not contract owner");
        _;
    }
    
    /** 
    * @dev Modifier that implements multi-party consensus to execute a specific function
    */
    modifier requireMultiPartyConsensus(bool mode)
    {
        _; 
        
        bool isDuplicate = false;

        for(uint c=0; c<multiCalls.length; c++) {
            if (multiCalls[c] == msg.sender) {
                isDuplicate = true;
                break;
                }
        }

        require(!isDuplicate, "Caller has already called this function.");

        multiCalls.push(msg.sender);

        uint256 numberAgreedAirlines = multiCalls.length;
        uint256 numberTotalAirlines = airlineAccts.length-1;
        uint256 PercentageAirlinesAgreed = numberAgreedAirlines.mul(100).div(numberTotalAirlines);
        emit PAirlinesAgreed(PercentageAirlinesAgreed, numberAgreedAirlines, numberTotalAirlines, airlineAccts);

            if (PercentageAirlinesAgreed >= VOTING_THRESHOLD) {
                operational = mode;   
                multiCalls = new address[](0);      
            }  

    }

    /** 
    * @dev Modifier that implements "Rate Limiting" as a payment protection pattern (in general limiting function calls when applied)
    */ 
    modifier rateLimit(uint256 time) {
        require(block.timestamp >= enabled, "Rate limiting in effect");
        enabled = enabled.add(time);
        _;
    }

    /**
    * @dev Modifier that requires the function caller to be a registered and participating (submitted funds) Airline
    */
    modifier requireIsAirline()
    {
        require(airlines[msg.sender].isRegistered, "Arlines can only be active if they are registered - Please register first!");
        require(airlines[msg.sender].isActive, "Only active airlines can register new ones!");
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
                                bool mode,
                                string reasonForStateChange
                            ) 
                            external
                            requireMultiPartyConsensus(mode)
                            requireIsAirline
    {
        emit StateChanged(mode, reasonForStateChange);
    }
    
    function authorizeContract
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    function deauthorizeContract
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
	
    
    /**
    * @dev Gets specific element / address from airlines mapping!
    */    
    function getAirlines() external view requireIsOperational returns(address[] memory) {
        return airlineAccts;
    }

    /**
    * @dev Gets name of specific Airline in airlines mapping!
    */    
    function getAirlineName(address addressAirline) external view requireIsOperational returns(string memory) {
        return airlines[addressAirline].airlineName;
    }

    /**
    * @dev Gets the amount of airlines already registered
    */    
    function numberRegisteredAirlines() external view returns(uint256) {
        uint256 lengthAirlineArray = airlineAccts.length;
        return lengthAirlineArray;
    }

    /**
    * @dev Checking if registered airline is active (has paid the requested fund)
    */    
    function IsAirlineActive (address addressAirline) external view requireIsOperational returns(bool) {
        require(addressAirline != address(0), "0x0 address not allowed!");
        require(airlines[addressAirline].isRegistered, "Airlines is not yet registered, please register and await voting!");
        return airlines[addressAirline].isActive;
    }   

    /**
    * @dev Checking if address is registered airline
    */    
    function IsAirlineRegistered (address addressAirline) external view requireIsOperational returns(bool) {
        require(addressAirline != address(0), "0x0 address not allowed!");
        return airlines[addressAirline].isRegistered;
    } 
    
   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline (address addressAirline, string nameAirline) external
                            requireIsOperational
                            requireIsCallerAuthorized      
    {
    	require(airlines[addressAirline].isRegistered != true , "Airline already registered");
        
    	airlines[addressAirline] = Airline({
            isRegistered: true,
            isActive: false,
            addressAirline: addressAirline,
            airlineName: nameAirline,
            fund: 0
        });
    }
    
    /**
    * @dev Activate already registered Airline
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function activateAirline
                            (   
                                address addressAirline,
                                uint256 amountPaid
                            )
                            external
                            requireIsCallerAuthorized
                            requireIsOperational
    {
        airlines[addressAirline].isActive = true;
        airlines[addressAirline].fund = amountPaid;
    }
    
    function registerFlight
                                (
                                	string flight,
                                    uint256 timestamp,
                                    address airline
                                )
                                external
                                requireIsCallerAuthorized
                            	requireIsOperational
    {
    
    	require(flights[flightkey].isRegistered != true , "Flight already registered");
        
		bytes32 flightkey = getFlightKey(msg.sender, flight, timestamp);
        
        flights[flightkey] = Flight({
            isRegistered: true,
            statusCode: 0,
            updatedTimestamp: timestamp,
            airline: airline
        });
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            )
                            external
                            payable
                            
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract    should be self-sustaining
       */   
    function fund
                            (   
                            )
                            public
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string flight,
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
    
    function() 
                            external 
                            payable 
    {
        fund();
    }*/


}

