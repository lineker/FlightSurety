
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            if(error) {
                console.log(error);
            }else {
                console.log('isOperational:' + result);
            }
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        contract.getAirlines((error, result) => {
            console.log('getAirlines:');
            console.log(error,result);
            
        });

        contract.setOperational(false, (error, result) => {
            console.log('setOperational:');
            if(error) {
                console.log(error,result);
            }
            
        });

        contract.getOwner((error, result) => {
            if(error) {
                console.log(error);
            }else {
                console.log('getOwner:' + result);
            }
            
        });

        

        $.each(contract.airlines, function (i, item) {
            $('#airline-selector').append($('<option>', { 
                value: item,
                text : item 
            }));
        });

        $.each(contract.passengers, function (i, item) {
            $('#passenger-selector').append($('<option>', { 
                value: item,
                text : item 
            }));
        });
        
        DOM.elid('register-airline').addEventListener('click', () => {
            var airlineAddress = $("#airline-selector option:selected").val();
            // Write transaction
            contract.registerAirline(airlineAddress, (error, result) => {
                display('Airline', 'Registered', [ { label: 'Airline:', error: error, value: airlineAddress} ]);
            });
        })

        DOM.elid('fund-airline').addEventListener('click', () => {
            var airlineAddress = $("#airline-selector option:selected").val();
            // Write transaction
            contract.fund(airlineAddress, "10", (error, result) => {
                if(error) {
                    console.log(error);
                }else {
                    display('Airline', 'Funded', [ { label: 'Airline:', error: error, value: airlineAddress + " => 10 ether"} ]);
                }
                
            });
        })

        DOM.elid('register-flight').addEventListener('click', () => {
            var airlineAddress = $("#airline-selector option:selected").val();
            let flight = DOM.elid('flight-number').value;
            let destination = DOM.elid('destination').value;
            // Write transaction
            console.log("registering flight: ");
            console.log(airlineAddress);
            console.log(flight);
            console.log(destination);
            contract.registerFlight(flight, destination, airlineAddress, (error, result) => {
                display('Flight', 'Registered', [ { label: 'Airline:', error: error, value: airlineAddress} ]);
            });
        })

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('buy-insurance').addEventListener('click', () => {
            var passengerAddress = $("#passenger-selector option:selected").val();
            let amount = DOM.elid('insurance-amount').value;
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.buyInsurance(flight, amount, passengerAddress, (error, result) => {
                display('Passenger', 'Insurance', [ { label: 'Bought Insurance', error: error, value: "Flight: "+ result.flight + " => amount: " + amount + " => passenger: " + result.passenger} ]);
            });
        })

        DOM.elid('withdraw').addEventListener('click', () => {
            var passengerAddress = $("#passenger-selector option:selected").val();
            // Write transaction
            contract.withdraw(passengerAddress, (error, result) => {
                display('Passenger', 'Withdraw', [ { label: 'Withdraw credit', error: error, value: ""} ]);
            });
        })
    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







