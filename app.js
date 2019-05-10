////////////////////////////////////////////////////

require('dotenv').config()

const bodyParser = require('body-parser')

const express = require('express')

const fs = require('fs')

const request = require('request')

const okta = require('@okta/okta-sdk-nodejs')
const OktaAuth = require('@okta/okta-auth-js');

///////////////////////////////////////////////////

const client = new okta.Client({
	orgUrl: process.env.OKTA_TENANT,
	token: process.env.API_TOKEN
})

const authClient = new OktaAuth({
	url: process.env.OKTA_TENANT
})

///////////////////////////////////////////////////

// SET UP WEB SERVER
const app = express()

var port = process.env.PORT

app.use(express.static('public'))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.listen(port, function () {
	console.log('App listening on port ' + port + '...');
})

///////////////////////////////////////////////////

app.get('/', function (req, res) {

	fs.readFile('html/index.html', "utf8", (err, page) => {
		if (err) {
			console.log("error reading the index.html file")
		}

		page = page.replace(/{{OKTA_TENANT}}/g, process.env.OKTA_TENANT)
		page = page.replace(/{{REDIRECT_URI}}/g, process.env.REDIRECT_URI)
		page = page.replace(/{{CLIENT_ID}}/g, process.env.CLIENT_ID)

		res.send(page)
	})
})

app.post('/register', function (req, res) {

	const { body } = req

	console.log("the request body is:")

	console.dir(body)

	pwd = generatePwd(32)

	const newUser = {
		profile: {
			email: body.email,
			login: body.email,
		},
		credentials: {
			password : {
				value: pwd
			}
		}
	}

	client.createUser(newUser)
	.then(user => {
		console.log('Created user', user)

		authClient.signIn({
			username: body.email,
			password: pwd
		})
		.then(function(transaction) {
			console.log(transaction.data.sessionToken)

			if (transaction.status === 'SUCCESS') {

				console.log("the transaction status is: ")
				console.dir(transaction)

				client.getUser(body.email)
				.then(user => {
					console.log(user)

					user.addToGroup(process.env.PASSWORDLESS_GROUP_ID)
					.then(function() {
						console.log('User has been added to group')

						res.redirect(process.env.REDIRECT_URI + "/?sessionToken=" + transaction.data.sessionToken)

					})
				})
			}
			else {
				throw 'We cannot handle the ' + transaction.status + ' status';
			}
		})
		.fail(function(err) {
			console.error(err)
		})
	})
})

function generatePwd(length) {
	var result           = '';
	var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}
