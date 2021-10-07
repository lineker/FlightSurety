import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = ['0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1', '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0', '0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b', '0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d', '0xd03ea8624C8C5987235048901fB614fDcA89b117', '0x95cED938F7991cd0dFcb48F0a06a40FA1aF46EBC', '0x3E5e9111Ae8eB78Fe1CC3bb8915d5D461F3Ef9A9', '0x28a8746e75304c0780E011BEd21C72cD78cd535E', '0xACa94ef8bD5ffEE41947b4585a84BdA5a3d3DA6E', '0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e', '0x610Bb1573d1046FCb8A70Bbbd395754cD57C2b60', '0x855FA758c77D68a04990E992aA4dcdeF899F654A', '0xfA2435Eacf10Ca62ae6787ba2fB044f8733Ee843', '0x64E078A8Aa15A41B85890265648e965De686bAE6', '0x2F560290FEF1B3Ada194b6aA9c40aa71f8e95598', '0xf408f04F9b7691f7174FA2bb73ad6d45fD5d3CBe', '0x66FC63C2572bF3ADD0Fe5d44b97c2E614E35e9a3', '0xF0D5BC18421fa04D0a2A2ef540ba5A9f04014BE3', '0x325A621DeA613BCFb5B1A69a7aCED0ea4AfBD73A', '0x3fD652C93dFA333979ad762Cf581Df89BaBa6795'];
        this.passengers = ['0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1', '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0', '0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b', '0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d', '0xd03ea8624C8C5987235048901fB614fDcA89b117', '0x95cED938F7991cd0dFcb48F0a06a40FA1aF46EBC', '0x3E5e9111Ae8eB78Fe1CC3bb8915d5D461F3Ef9A9', '0x28a8746e75304c0780E011BEd21C72cD78cd535E', '0xACa94ef8bD5ffEE41947b4585a84BdA5a3d3DA6E', '0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e', '0x610Bb1573d1046FCb8A70Bbbd395754cD57C2b60', '0x855FA758c77D68a04990E992aA4dcdeF899F654A', '0xfA2435Eacf10Ca62ae6787ba2fB044f8733Ee843', '0x64E078A8Aa15A41B85890265648e965De686bAE6', '0x2F560290FEF1B3Ada194b6aA9c40aa71f8e95598', '0xf408f04F9b7691f7174FA2bb73ad6d45fD5d3CBe', '0x66FC63C2572bF3ADD0Fe5d44b97c2E614E35e9a3', '0xF0D5BC18421fa04D0a2A2ef540ba5A9f04014BE3', '0x325A621DeA613BCFb5B1A69a7aCED0ea4AfBD73A', '0x3fD652C93dFA333979ad762Cf581Df89BaBa6795'];
    }

    async initialize(callback) {

        // if (window.ethereum) {
        //     try {
        //         this.web3 = new Web3(window.ethereum);
        //         // Request account access
        //         await window.ethereum.enable();
        //     } catch (error) {
        //         // User denied account access...
        //         console.error("User denied account access")
        //     }
        // }
        // if (typeof this.web3 == "undefined") {
        //     this.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
        //     console.log("local ganache provider");
        // }

        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];
            console.log('accounts');
            console.log(accts);
            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
    console.log('isOperational');
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    setOperational(mode, callback) {
        console.log('setOperational:' + mode);
        let self = this;
        self.flightSuretyData.methods
             .setOperatingStatus(mode)
             .call({ from: self.owner}, callback);
     }

    registerAirline(airlineAddress, callback) {
        let self = this;
        let payload = {
            account : airlineAddress
        }
        console.log("registerAirline from:" + self.owner);
        self.flightSuretyApp.methods
            .registerAirline(payload.account)
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }

    getAirlines(callback) {
        let self = this;
        self.flightSuretyData.methods
            .getAirlines()
            .send({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }

    getOwner(callback) {
        let self = this;
        self.flightSuretyData.methods
            .getOwner()
            .send({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }

    fund(airlineAddress, amount, callback) {
        let self = this;
        let value = this.web3.utils.toWei(amount, "ether");
        self.flightSuretyData.methods
            .fund(airlineAddress)
            .send({ from: self.owner, value: value}, (error, result) => {
                callback(error, result);
            });
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                console.log(error);
                console.log(result);
                callback(error, payload);
            });
    }

    registerFlight(flight, destination, from, callback) {
        let self = this;
        let payload = {
            flight: flight,
            destination: destination,
            timestamp: Math.floor(Date.now() / 1000)
        }

        self.flightSuretyApp.methods
            .registerFlight(payload.flight, payload.destination, payload.timestamp)
            .send({ from: self.owner, 
                gas: 5000000,
                gasPrice: 20000000 }, (error, result) => {
                callback(error, payload);
            });
    }

    buyInsurance(flight, amount, passengerAddress, callback) {
        let self = this;

        let priceInWei = this.web3.utils.toWei(amount.toString(), "ether");
        let payload = {
            flight: flight,
            price: priceInWei,
            passenger: passengerAddress
        } 

        self.flightSuretyData.methods
            .buy(flight)
            .send({ from: payload.passenger, value: priceInWei,
                gas: 500000,
                gasPrice: 1
            }, (error, result) => {
                callback(error, payload);
            });
    }

    withdraw(passengerAddress, callback) {
        let self = this;

        let payload = {
            passenger: passengerAddress
        } 

        self.flightSuretyData.methods
            .withdraw(payload.passenger)
            .send({ from: payload.passenger,
                gas: 500000,
                gasPrice: 1
            }, (error, result) => {
                callback(error, payload);
            });
    }
}