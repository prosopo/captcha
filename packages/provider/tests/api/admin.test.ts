// import * as express from 'express'
// import { adminRouter } from '../../src/api/admin'
// import { expect } from 'chai'
// import jwt from 'jsonwebtoken'
// import sinon from 'sinon'
// import supertest from 'supertest'

// describe('Admin Router', () => {
//     let sandbox: sinon.SinonSandbox
//     let app: express.Application
//     let envMock

//     beforeEach(() => {
//         sandbox = sinon.createSandbox()
//         app = express()
//         envMock = {
//             config: {
//                 account: {
//                     address: 'testAddress',
//                     secret: 'testSecret',
//                 },
//             },
//         }
//         app.use(express.json())
//         app.use('/', adminRouter(envMock))
//     })

//     afterEach(() => {
//         sandbox.restore()
//     })

//     it('should authenticate the user', async () => {
//         // Arrange
//         const user = { address: envMock.config.account.address }
//         const accessToken = jwt.sign(user, envMock.config.account.secret, { expiresIn: '1h' })

//         // Act
//         const response = await supertest(app).post('/auth').send({ message: 'testMessage', signature: 'testSignature' })

//         // Assert
//         expect(response.status).to.equal(200)
//         expect(response.body).to.deep.equal({ accessToken })
//     })

//     it('should return 401 for bad auth', async () => {
//         // Arrange
//         // Set up the request data to cause an error

//         // Act
//         const response = await supertest(app).post('/auth').send({ message: 'badMessage', signature: 'badSignature' })

//         // Assert
//         expect(response.status).to.equal(401)
//         expect(response.body).to.deep.equal({ message: 'bad auth' })
//     })

//     it('should access secure endpoint', async () => {
//         // Arrange
//         const user = { address: envMock.config.account.address }
//         const accessToken = jwt.sign(user, envMock.config.account.secret, { expiresIn: '1h' })

//         // Act
//         const response = await supertest(app).get('/secure').set('Authorization', `Bearer ${accessToken}`)

//         // Assert
//         expect(response.status).to.equal(200)
//         expect(response.body).to.deep.equal({ message: 'correct auth' })
//     })
// })
