// const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });


'use strict';

// var service = require("./env.json");

// var firebaseConfig = {
   
//     databaseURL: "https://celoussd.firebaseio.com",
//     apiKey: "AIzaSyDFHXhUZYqZtF0h9CSdbC7IsC1Rwq9uhLg",
//     authDomain: "celoussd.firebaseapp.com",
//     projectId: "celoussd",
//     storageBucket: "celoussd.appspot.com",
//     messagingSenderId: "135354782212",
//     appId: "1:135354782212:web:03e199e77496ecc437db51",
//     measurementId: "G-5LE0RZR6EH"

// }



const functions = require('firebase-functions');
const admin = require('firebase-admin');
// admin.initializeApp();
const serviceAccount = require('./serviceAccountKey.json')

// admin.initializeApp({
//      credential: admin.credential.cert(serviceAccount),
//      databaseURL: "https://celoussd.firebaseio.com",

// });

const adminConfig = JSON.parse(process.env.FIREBASE_CONFIG);
adminConfig.credential = admin.credential.cert(serviceAccount);
admin.initializeApp(adminConfig);


// function getAppEmulator() {
//     const serviceAccount = require("./serviceAccountKey.json");
//     process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
//     process.env.FIREBASE_FIRESTORE_EMULATOR_ADDRESS = "localhost:8080";
//     admin
//       .initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//       });
//     return admin.app();
//   };
//   getAppEmulator();
const firestore = admin.firestore();
require('dotenv').config();



// Express and CORS middleware init
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const prettyjson = require('prettyjson');
var options = { noColor: true };

const router = express.Router();

var randomstring = require("randomstring");
var tinyURL = require('tinyurl');
var twilio = require('twilio');

// CElO init
const Kit = require('@celo/contractkit')
const path = require('path')

const kit = Kit.newKit('https://alfajores-forno.celo-testnet.org')

 const crypto = require('crypto');


const trimLeading0x = (input) => (input.startsWith('0x') ? input.slice(2) : input);
const ensureLeading0x = (input) => (input.startsWith('0x') ? input : `0x${input}`);
const hexToBuffer = (input) => Buffer.from(trimLeading0x(input), 'hex');


// GLOBAL VARIABLES
let publicAddress = '';
let sender = ``;
let receiver = ``;
var recipientId = ``;
var senderId = ``;
let amount = ``;


router.post("/", async (req, res) => {
    // Read variables sent via POST from our SDK
    const { sessionId, serviceCode, phoneNumber, text } = req.body;
    let response = '';    
    var data = text.split('*');

    if (text == '') {
        // This is the first request. Note how we start the response with CON
        response = `CON Welcome to GlobalGateway.
            ..Powered by @Celo blockchain..
        Select: 
        1. Send Money       
        2. Withdraw Cash    
        3. CDP
        4. My Account`;
    }     
    
//  1. TRANSFER FUNDS #SEND MONEY
    else if ( data[0] == '1' && data[1] == null) { 
        response = `CON Enter Recipient`;
    } else if ( data[0] == '1' && data[1]!== '' && data[2] == null) {  //  TRANSFER && PHONENUMBER
        response = `CON Enter Amount to Send:`;
        
    } else if ( data[0] == '1' && data[1] !== '' && data[2] !== '' ) {//  TRANSFER && PHONENUMBER && AMOUNT
         sender = phoneNumber.substring(1);
        sender = phoneNumber;
        console.log('Sender: ', sender.substring(1))
         receiver = data[1];  
        receiver = "254" + data[1].substring(1);
        console.log('Recipient: ', receiver)    
        amount = data[2];
        console.log('Amount: ', amount)
        response = `END KES `+amount+` sent to `+receiver+` Celo Account`;   //+data[1] recipient

        senderId = await getSenderId(sender)
        console.log('SenderId: ', senderId)
        recipientId = await getRecipientId(receiver)
        console.log('recipientId: ', recipientId)
        
        Promise.all([checkIfSenderExists(senderId), checkIfRecipientExists(recipientId)])
        .then(result => console.log(result))
        .then(()=>transfercUSD(senderId, recipientId, amount))
        .then(hash=>getTxidUrl(hash))
        .then(url=>{
            console.log('Transaction URL: ',url)
            console.log('PhoneNumber: ',sender)
             })
        .catch(err => console.log(err))       
        
    } 
    


//  2. WITHDRAW FUNDS
    else if ( data[0] == '2'  && data[1] == null) {
        // ('cUSD 200');
        response = `CON Enter Amount to Withdraw`;
    }else if ( data[0] == '2' && data[1]!== '') {  //  WITHDRAW && AMOUNT
        sender = phoneNumber.substring(1);  // phoneNumber to send sms notifications
        console.log('Phonenumber: ', sender);        
        amount = `${data[1]*100000000}`;
        console.log('Amount to Withdraw: KES.', data[1]);     // const amount = data[1];  
        
        response = `END You have withdrawn
         KES: `+data[1]+` from account: `+phoneNumber.substring(1);        
    }

    //  3. DEPOSIT FUNDS
    else if ( data[0] == '3' && data[1] == null) { 
        response = `CON Enter Amount to Deposit`;
    } else if ( data[0] == '3' && data[1]!== '') {  //  DEPOSIT && AMOUNT
        let depositMSISDN = phoneNumber.substring(1);  // phoneNumber to send sms notifications
        console.log('Phonenumber: ', depositMSISDN);        
        amount = `${data[1]}`;
        let Deposit = await phoneNumber.substring(depositMSISDN, data[1])
        if(Deposit){
            depositMSISDN =  phoneNumber.substring(1)  // phoneNumber to send sms notifications
            console.log('Depositor: ', depositMSISDN)  
            let escrowMSISDN = process.env.CELO_ESCROW_MSISDN;
            console.log('Escrow: ', escrowMSISDN) 
            console.log('Amount: ', amount)

            response = `END You have deposited KES:  `+amount+` to `+depositMSISDN+` Celo Account`;   //+data[1] recipient

            let escrowId = await getSenderId(escrowMSISDN)
            console.log('EscrowId: ', escrowId)
            let depositorId = await getRecipientId(depositMSISDN)
            console.log('depositorId: ', depositorId)
            
            Promise.all([checkIfSenderExists(escrowId), checkIfRecipientExists(depositorId)])
            .then(result => console.log(result))
            .then(()=>transfercUSD(escrowId, depositorId, amount))
            .then(hash=>{
                console.log('shortening url')
                getTxidUrl(hash)
            })
            .then(url=>{
                console.log('Transaction URL: ',url)
                console.log('PhoneNumber: ',depositMSISDN)
                twilioSMSSender(depositMSISDN, url) 
            })
            .catch(err => console.log(err))    
        }        
         response = `END You have deposited KES: `+data[1]+` to account: `+phoneNumber.substring(1);
                       
    }


//  7. ACCOUNT DETAILS
    else if ( data[0] == '4' && data[1] == null) {
        // Business logic for first level response
        response = `CON Choose account information you want to view
        1. Account Details
        2. Account balance`;
    }else if ( data[0] == '4' && data[1] == '1') {
        let userMSISDN = phoneNumber.substring(1);
        response = await getAccDetails(userMSISDN);        
    }else if ( data[0] == '4'  && data[1] == '2') {
        let userMSISDN = phoneNumber.substring(1);
        response = await getAccBalance(userMSISDN);        
    }

    res.set('Content-Type: text/plain');
    res.send(response);
    // DONE!!!
});



async function getAccBalance(userMSISDN){
    console.log(userMSISDN);
    let userId = await getRecipientId(userMSISDN)
    console.log(userId)
    let accAddress = await getReceiverDetails(userId)
    console.log(accAddress.receiverAddress)

    const awaitWrapper = await kit.contracts.getStableToken()
    let cUSDBalance = await awaitWrapper.balanceOf(accAddress.receiverAddress) // In cUSD
    cUSDBalance = kit.web3.currentProvider.utils.fromWei(cUSDBalance.toString(), 'ether');
    console.info(`Account balance of ${cUSDBalance.toString()}`)

    const goldTokenWrapper = await kit.contracts.getGoldToken()
    let cGoldBalance = await goldTokenWrapper.balanceOf(accAddress.receiverAddress) // In cGLD
    cGoldBalance = kit.web3.currentProvider.utils.fromWei(cGoldBalance.toString(), 'ether');    
    console.info(`Account balance of ${cGoldBalance.toString()}`)

    return `END Your Account Balance is:
             Celo Dollar: ${cUSDBalance} cUSD
             Celo Gold: ${cGoldBalance} cGLD`;
}

async function getAccDetails(userMSISDN){
    console.log(userMSISDN);
    let userId = await getRecipientId(userMSISDN)
    console.log(userId)
    let accAddress = await getReceiverDetails(userId)
    console.log(accAddress.receiverAddress)
    let url = await getAddressUrl(accAddress.receiverAddress)
    console.log('Address: ',url);            
    return `END Your Account Number is: ${userMSISDN}
                ...Account Address is: ${url}`;
}

async function transfercGOLD(senderId, recipientId, amount){
    try{
      let senderInfo = await getSenderDetails(senderId);
      console.log('Sender Adress: ',  senderInfo.SenderAddress);
      //console.log('Sender seedkey: ', senderInfo.seedKey);
      let senderprivkey =  `${await generatePrivKey(senderInfo.seedKey)}`;
      console.log('Sender Private Key: ',senderprivkey)
      let receiverInfo = await getReceiverDetails(recipientId);
      console.log('Receiver Adress: ', receiverInfo.receiverAddress);      
      let cGLDAmount = `${amount*10000000}`;
      console.log('cGOLD Amount: ', cGLDAmount)
      sendcGold(`${senderInfo.SenderAddress}`, `${receiverInfo.receiverAddress}`, cGLDAmount, senderprivkey)
    }
    catch(err){console.log(err)}
  }
  
  async function transfercUSD(senderId, recipientId, amount){
    try{
      let senderInfo = await getSenderDetails(senderId);
      console.log('Sender Adress: ', senderInfo.SenderAddress);
      let senderprivkey =  `${await generatePrivKey(senderInfo.seedKey)}`;
      console.log('Sender Private Key: ',senderprivkey)
      //console.log('Sender seedkey: ', senderInfo.seedKey);
      let receiverInfo = await getReceiverDetails(recipientId);
      console.log('Receiver Adress: ', receiverInfo.receiverAddress);
      let cUSDAmount = amount*0.01;
      console.log('cUSD Amount: ', cUSDAmount);
      return sendcUSD(`${senderInfo.SenderAddress}`, `${receiverInfo.receiverAddress}`, cUSDAmount, senderprivkey);
    }
    catch(err){console.log(err)}
  }
  
  async function checkIfUserExists(userId, userMSISDN){
    return new Promise(resolve => {
      admin.auth().getUser(userId)
        .then(function(userRecord) {          
            if (userRecord) {
                console.log('Successfully fetched user data:', userRecord.toJSON());
                resolve (userRecord);
            } else {
              console.log("Document", userId, "does not exists:\n");
              createNewUser(userId, userMSISDN);
            }
        })
        .catch(function(error) {
            console.log('Error fetching user data:', error);
        });
    });  
  }  

function createNewUser(userId, userMSISDN){
    return new Promise(resolve => {
        admin.auth().createUser({
            uid: userId,
            phoneNumber: userMSISDN
        })
        .then(function(userRecord) {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log('Successfully created new user:', userRecord.uid);
            resolve (userRecord.uid);
        })
        .catch(function(error) {
            console.log('Error creating new user:', error);
        });
        resolve (uid);
    });  
}
  
async function addUserDataToDB(userId){    
    let docRef = firestore.collection('accounts').doc(userId);
    
    let loginpin = await generateLoginPin();
    console.log('Login Pin:\t', loginpin);      

    let mnemonic = await bip39.generateMnemonic(256);
    let mnemonic = 'crush swing work toast submit sense remember runway that ball sudden wash blast pen citizen liquid style require head comic curtain original sell shield';
    console.log('Seed Key:\t', mnemonic);

    publicAddress = await getPublicAddress(mnemonic);
    console.log('Public Address: ', publicAddress);
        
    const newAccount = {
        'seedKey' : `${mnemonic}`,
        'publicAddress' : `${publicAddress}`,
        'userLoginPin' : loginpin
    };
    console.log(newAccount);
    docRef.set(newAccount).then(setDoc => {console.log("Document Created:\n", setDoc.id, "=>",setDoc.data)})
}
  
  async function getSenderDetails(senderId){
    return new Promise(resolve => {
       let docRef = firestore.collection('accounts').doc(senderId);
       docRef.get().then((doc) => {
        resolve ({   
          SenderAddress: doc.data().publicAddress, 
          seedKey: doc.data().seedKey, 
          userLoginPin: doc.data().userLoginPin 
        });
      })
    });   
  }

// function twilioSMSSender(to, message) {
//     var accountSid = process.env.TWILI_API_accountSid; // Your Account SID from www.twilio.com/console
//     var authToken = process.env.TWILI_API_authToken;   // Your Auth Token from www.twilio.com/console
//     var twilioPhoneNumber = process.env.TWILI_API_phoneNumber;

//     var client = new twilio(accountSid, authToken);

//     client.messages.create({
//         body: message,
//         to: to,  // Text this number
//         from: twilioPhoneNumber // From a valid Twilio number
//     })
//     .then((message) => console.log(message.sid));
// }

//SEND GET shortURL
async function getTxidUrl(txid){
   return await getSentTxidUrl(txid);
}

function getSentTxidUrl(txid){      
    return new Promise(resolve => {    
        const sourceURL = `https://alfajores-blockscout.celo-testnet.org/tx/${txid}/token_transfers`;
        resolve (tinyURL.shorten(sourceURL))        
    });
}

//GET ACCOUNT ADDRESS shortURL
async function getAddressUrl(userAddress){
    return await getUserAddressUrl(userAddress);
}

function getUserAddressUrl(userAddress){
    return new Promise(resolve => {    
        const sourceURL = `https://alfajores-blockscout.celo-testnet.org/address/${userAddress}/tokens`;
        resolve (tinyURL.shorten(sourceURL));
      });   
}
  
  async function getReceiverDetails(recipientId){
    return new Promise(resolve => {
       let docRef = admin.collection('accounts').doc(recipientId);
       docRef.get().then((doc) => { 
        resolve ({   
          receiverAddress: doc.data().publicAddress    
        });
      })
    });  
  }

function getSenderId(phoneNumber){
    return new Promise(resolve => {
      let senderId = crypto.createHash('sha1').update(phoneNumber.substring(1)).digest('hex');
      resolve(senderId);
    });
  } 
  
function getRecipientId(phoneNumber){
    return new Promise(resolve => {
       let recipientId = crypto.createHash('sha1').update(phoneNumber).digest('hex');
       resolve(recipientId);
    });
} 

  async function checkIfSenderExists(senderId, senderMSISDN){
      await checkIfUserExists(senderId, senderMSISDN)
      return true
  }

  async function checkIfRecipientExists(recipientId, receiverMSISDN){
    await checkIfUserExists(recipientId, receiverMSISDN)
    return true
 }
    
      
    function generateLoginPin(){
      return new Promise(resolve => {    
        let loginpin = randomstring.generate({ length: 5, charset: 'numeric' });
        //loginpin = 'x'+loginpin;
        resolve (loginpin);
      });
    }  
  
    //CELOKIT FUNCTIONS
  async function getPublicAddress(mnemonic){
    console.log('Getting your account Public Address:....')
    let privateKey = await generatePrivKey(mnemonic);
    return new Promise(resolve => { 
        resolve (getAccAddress(getPublicKey(privateKey)));
      });
}

async function generatePrivKey(mnemonic){
    return bip39.mnemonicToSeedHex(mnemonic).substr(0, 64);
}

function getPublicKey(privateKey){
    let privToPubKey = hexToBuffer(privateKey);
    privToPubKey = privateToPublic(privToPubKey).toString('hex');
    privToPubKey = ensureLeading0x(privToPubKey);
    privToPubKey = toChecksumAddress(privToPubKey);
    return privToPubKey;
}

function getAccAddress(publicKey){
    let pubKeyToAddress = hexToBuffer(publicKey);
    pubKeyToAddress = pubToAddress(pubKeyToAddress).toString('hex');
    pubKeyToAddress = ensureLeading0x(pubKeyToAddress);
    pubKeyToAddress = toChecksumAddress(pubKeyToAddress)
    return pubKeyToAddress;   
}

async function sendcGold(sender, receiver, amount, privatekey){
    kit.addAccount(privatekey)

    let goldtoken = await kit.contracts.getGoldToken()
    let tx = await goldtoken.transfer(receiver, amount).send({from: sender})
    let receipt = await tx.waitReceipt()
    console.log('Transaction Details......................\n',prettyjson.render(receipt, config))
    console.log('Transaction ID:..... ', receipt.events.Transfer.transactionHash)

    let balance = await goldtoken.balanceOf(receiver)
    console.log('cGOLD Balance: ',balance.toString())
    return receipt.events.Transfer.transactionHash;
}

async function convertfromWei(value){
    return kit.web3.utils.fromWei(value.toString(), 'ether');
}

async function sendcUSD(sender, receiver, amount, privatekey){
    const weiTransferAmount = kit.web3.utils.toWei(amount.toString(), 'ether')
    const stableTokenWrapper = await kit.contracts.getStableToken()

    const senderBalance = await stableTokenWrapper.balanceOf(sender) // In cUSD
    if (amount > senderBalance) {        
        console.error(`Not enough funds in sender balance to fulfill request: ${await convertfromWei(amount)} > ${await convertfromWei(senderBalance)}`)
        return false
    }
    console.info(
        `sender balance of ${await convertfromWei(senderBalance)} cUSD is sufficient to fulfill ${await convertfromWei(weiTransferAmount)} cUSD`
    )

    kit.addAccount(privatekey)
    const stableTokenContract = await kit._web3Contracts.getStableToken()
    const txo = await stableTokenContract.methods.transfer(receiver, weiTransferAmount)
    const tx = await kit.sendTransactionObject(txo, { from: sender })
    console.info(`Sent tx object`)
    const hash = await tx.getHash()
    console.info(`Transferred ${amount} dollars to ${receiver}. Hash: ${hash}`)
    return hash
}

//working
async function getBlock() {
    // return web3.eth.getBlock('latest');
    return kit.web3.currentProvider.eth.getBlock('latest');
}

exports.addUserData = functions.auth.user().onCreate((user) => {
    addUserDataToDB(user.uid)
});

exports.GlobalGateway = functions.https.onRequest(app);
module.exports = router;