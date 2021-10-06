
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address, { from: accounts[0] });
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(operations) App contract is authorized by Data contract`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isAuthorized.call(config.flightSuretyApp.address);
    assert.equal(status, true, "App contract should be authorized");

  });

  it(`(operations) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(operations) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(operations) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(operations) can block access to functions using requireIsOperational when operating status is false`, async function () {
      if(!await config.flightSuretyData.isOperational) {
        await config.flightSuretyData.setOperatingStatus(false, { from: accounts[0] });
      }

      let reverted = false;
      try 
      {
          await config.flightSuretyData.getAirlines();
          console.print('here');
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded (active)', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });
  
  it('(airline) Contract owner is registered as an airline when contract is deployed', async () => {
    let airlinesCount = await config.flightSuretyData.numberRegisteredAirlines.call(); 
    let isAirline = await config.flightSuretyData.isAirline.call(accounts[0]); 
    assert.equal(isAirline, true, "First airline should be registired at contract deploy.");
    assert.equal(airlinesCount, 1, "Airlines count should be one after contract deploy.");
  });

  it('(airline) can register an Airline using registerAirline() directly without need of a consensus', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    // ACT
    try {
        await config.flightSuretyData.registerAirline(newAirline, {from: accounts[0]});
    }
    catch(e) {
      console.log(e);
    }
    let airlinesCount = await config.flightSuretyData.numberRegisteredAirlines.call(); 
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(airlinesCount, 2, "Airlines count should be one after contract deploy.");
    assert.equal(result, true, "Airline should be able to register another airline directly if there are less than 4 registered");
    
  });

  it("(airline) funded airline is active", async () => {
    // ARRANGE
    let newAirline = accounts[1];

    // ACT
    try {
        let funds = await config.flightSuretyData.MINIMUM_FUNDS.call();
        await config.flightSuretyData.registerAirline(newAirline,  {from: accounts[0]});
        await config.flightSuretyData.fund(newAirline, {from: newAirline, value: funds});
    }
    catch(e) {
      console.log(e);
    }
    let isRegistered = await config.flightSuretyData.isAirline.call(newAirline);
    let isActive = await config.flightSuretyData.isAirlineActive.call(newAirline);
    let airlinesCount = await config.flightSuretyData.numberRegisteredAirlines.call(); 

    // ASSERT
    assert.equal(isRegistered, true, "Airline should be registered");
    assert.equal(isActive, true, "Airline should be active since it has funds");
  });

  it('(airline) Airline is not register without consensus', async () => {
    // ARRANGE
    let airlinesCount = await config.flightSuretyData.numberRegisteredAirlines.call(); 
    assert.equal(airlinesCount, 3, "require contract to have 3 registered airlines already");
    let newAirline = accounts[4];
    let funds = await config.flightSuretyData.MINIMUM_FUNDS.call();

    await config.flightSuretyData.registerAirline(accounts[3], {from: accounts[0]});
    
    await config.flightSuretyData.fund(accounts[0], {from: accounts[1], value: funds});
    await config.flightSuretyData.fund(accounts[1], {from: accounts[1], value: funds});
    await config.flightSuretyData.fund(accounts[2], {from: accounts[1], value: funds});
    await config.flightSuretyData.fund(accounts[3], {from: accounts[1], value: funds});

    let airlinesCount2 = await config.flightSuretyData.numberRegisteredAirlines.call(); 
    assert.equal(airlinesCount2, 4, "require contract to have 4 registered airlines already 2");

    // ACT
    try {
        await config.flightSuretyData.registerAirline(newAirline, {from: accounts[0]});
    }
    catch(e) {
      console.log(e);
    }
    let airlinesCount3 = await config.flightSuretyData.numberRegisteredAirlines.call(); 
    let isRegistered = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(airlinesCount3, 4, "Airlines count should be 4 since not everybody voted to register airline 4");
    assert.equal(isRegistered, false, "NewAirline show not be registered");
    
  });

  it('(airline) Airline cannot vote twice', async () => {
    // ARRANGE
    let newAirline = config.testAddresses[0];

    //await config.flightSuretyData.registerAirline(accounts[3], {from: accounts[0]});
    
    // await config.flightSuretyData.fund(accounts[0], {from: accounts[1], value: funds});
    // await config.flightSuretyData.fund(accounts[1], {from: accounts[1], value: funds});
    // await config.flightSuretyData.fund(accounts[2], {from: accounts[1], value: funds});
    // await config.flightSuretyData.fund(accounts[3], {from: accounts[1], value: funds});
    let registered = true;
    // ACT
    try {
        await config.flightSuretyData.registerAirline(newAirline, {from: accounts[0]});
        await config.flightSuretyData.registerAirline(newAirline, {from: accounts[0]});
    }
    catch(e) {
      //console.log(e);
      registered = false;
    }
    let airlinesCount3 = await config.flightSuretyData.numberRegisteredAirlines.call(); 
    let isRegistered = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(airlinesCount3, 4, "Airlines count should be 4 since not everybody voted to register airline 4");
    assert.equal(registered, false, "NewAirline show not be registered");
    
  });

  it('(airline) can register an Airline using registerAirline() with consensus', async () => {
    
    // ARRANGE
    let newAirline = accounts[5];
    let funds = await config.flightSuretyData.MINIMUM_FUNDS.call();
    //NO NEED SINCE IT WAS ALREADY DONE ON PREVIOUS TEST
    //await config.flightSuretyData.registerAirline(accounts[3], {from: accounts[0]});
    await config.flightSuretyData.fund(accounts[0], {from: accounts[0], value: funds});
    await config.flightSuretyData.fund(accounts[1], {from: accounts[1], value: funds});
    await config.flightSuretyData.fund(accounts[2], {from: accounts[2], value: funds});
    await config.flightSuretyData.fund(accounts[3], {from: accounts[3], value: funds});

    let airlinesCount2 = await config.flightSuretyData.numberRegisteredAirlines.call(); 
    assert.equal(airlinesCount2, 4, "require contract to have 4 registered airlines already 2");

    
    // ACT
    try {
        await config.flightSuretyData.registerAirline(newAirline, {from: accounts[0]});
        await config.flightSuretyData.registerAirline(newAirline, {from: accounts[1]});
        await config.flightSuretyData.registerAirline(newAirline, {from: accounts[2]});
        await config.flightSuretyData.registerAirline(newAirline, {from: accounts[3]});
    }
    catch(e) {
      console.log('Test');
      console.log(e);
    }
    let airlinesCount3 = await config.flightSuretyData.numberRegisteredAirlines.call(); 
    let isRegistered = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(airlinesCount3, 5, "Airlines count should be 4 since not everybody voted to register airline 4");
    assert.equal(isRegistered, true, "NewAirline show not be registered");
    
  });
});
