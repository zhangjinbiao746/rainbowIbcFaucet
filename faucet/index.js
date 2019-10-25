const express = require('express');
const Crypto = require('irisnet-crypto');
const request = require('request');
const http = require('http');
const qs = require('querystring');
const app = express();
const config = require("./config");


let arrayAddressArr = [],isPostedSuccess = true;

// let addressInformation = Crypto.getCrypto('iris','testnet').recover('surprise absurd mind pitch soccer foil zone orange type recall butter wisdom cigar situate grab ladder display loyal impose curtain syrup great retire best',"english");
//iris 水龙头地址信息
let irisAddressInformation = Crypto.getCrypto('iris','testnet').recover(`${config.app.irisMnemonicWord}`);
//cosmos 水龙头地址信息
let commosAddressInformation = Crypto.getCrypto('cosmos','testnet').recover(`${config.app.cosmosMnemonicWord}`);
let iris_account_number,iris_sequence,cosmos_account_number,cosmos_sequence;
function getAccountNumberAndSequence(){
	let irisUrl = `${config.app.irisLcdUrl}/auth/accounts/${irisAddressInformation.address}`;
	let cosmosUrl = `${config.app.cosmosLcdUrl}/auth/accounts/${commosAddressInformation.address}`;
	request.get(irisUrl,(error, response, body) => {
			let parseBody = JSON.parse(body);
			iris_account_number = Number(parseBody.result.value.account_number);
			iris_sequence = Number(parseBody.result.value.sequence)
		});
	request.get(cosmosUrl,(error, response, body) => {
		let parseBody = JSON.parse(body);
		cosmos_account_number = Number(parseBody.result.value.account_number);
		cosmos_sequence = Number(parseBody.result.value.sequence)
	})
}
getAccountNumberAndSequence();
app.get('/api/faucet',(req,res) => {
	arrayAddressArr.push(req.query);
	res.send({
		code: 1,
		msg:'success',
	});
	let chainId,from,gas,fees,memo,account_number,sequence,denom,AddressInformationPrivateKey,url;
	var timer = setInterval(() => {
		console.log(arrayAddressArr.length,"address count");
		if(arrayAddressArr.length !== 0){
			if(isPostedSuccess){
				isPostedSuccess = false;
				if(arrayAddressArr[arrayAddressArr.length -1].chainName === "iris"){
					chainId = `${config.app.irisChainId}`;
					from = irisAddressInformation.address;
					gas = `${config.app.gasNumber}`;
					fees = {denom: "uiris", amount: 100000};
					memo = '';
					account_number = iris_account_number;
					sequence = iris_sequence;
					denom = 'uiris';
					AddressInformationPrivateKey = irisAddressInformation.privateKey;
					url = `${config.app.irisLcdUrl}/txs`
				}else if(arrayAddressArr[arrayAddressArr.length -1].chainName === "cosmos"){
					chainId = `${config.app.cosmosChainId}`;
					from = commosAddressInformation.address;
					gas = `${config.app.gasNumber}`;
					fees = {denom: "uatom", amount: 100000};
					memo = '';
					account_number = cosmos_account_number;
					sequence = cosmos_sequence;
					denom = 'uatom';
					AddressInformationPrivateKey = commosAddressInformation.privateKey;
					url = `${config.app.cosmosLcdUrl}/txs`
				}
				let tx = {
					chain_id: chainId,
					from: from,
					account_number: account_number,
					sequence: sequence,
					fees: fees,
					gas: gas,
					memo:'',
					type: 'transfer',
					msg: {
						to: req.query.address,
						coins: [
							{
								denom: denom,
								amount: `${config.app.tokenNumber}`
							}
						]
					}
				};
				let builder = Crypto.getBuilder(req.query.chainName,'testnet');
				let signTx = builder.buildAndSignTx(tx,AddressInformationPrivateKey);
				let postTx = signTx.GetData();
				postTx.mode='block';
				return request({
					url: url,
					method: "POST",
					json:true,
					body: postTx
				}, (error, response, body) => {
					isPostedSuccess = true;
					getAccountNumberAndSequence();
					if(error){
						console.log(error)
					}else if (!error && response.statusCode == 200) {
						isPostedSuccess = true;
						if(body && body.logs && body.logs[0].success){
							arrayAddressArr.pop(arrayAddressArr.length - 1);
							if(arrayAddressArr.length === 0){
								arrayAddressArr = [];
								clearInterval(timer)
							}
						}
					}
				})
			}
		}else {
			clearInterval(timer)
		}
	},3000)
})


app.listen(3000, () => console.log('Example app listening on port 3000!'));
