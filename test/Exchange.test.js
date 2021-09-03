//jshint esversion:8
import { tokens, ether, EVM_REVERT, ETHER_ADDRESS } from "./helpers"

const Token = artifacts.require("./Token");
const Exchange = artifacts.require("./Exchange");

require("chai").use(require("chai-as-promised")).should();

contract('Exchange', ([deployer, feeAccount, user1, user2]) => { //can add more accounts into the array here. accounts is call back function for this contract. injects all the accoutsn involved . can also break down to different accounts 
    
    let token
    let exchange
    const feePercent = 10;

    beforeEach(async() => {
        token = await Token.new(); // deploy tokens

        token.transfer(user1, tokens(100), {from: deployer}); // transfer tokens from user 1

        exchange = await Exchange.new(feeAccount, feePercent); // Deploy exchange. what does.new mean? A new instance perhaps, deploy exchange
        
    });
    describe("deployment", () => {
      it("tracks the fee account", async () => {
        const result = await exchange.feeAccount();
        result.should.equal(feeAccount);
        });
        
     it("tracks the fee percent", async () => {
        const result = await exchange.feePercent();
        result.toString().should.equal(feePercent.toString());
        });
    });

    describe("fallback", () => {
        it("reverts when Ether is sent", async () => {
            await exchange.sendTransaction({ value: 1, from: user1}).should.be.rejectedWith(EVM_REVERT)// sends a basic eth transactions
        })
    })

    describe("depositing ether", async () => {
      let result
      let amount 

      beforeEach(async () => {
          amount = ether(1)
          result = await exchange.depositEther({from: user1, value: amount})
      })
      it("tracks the Ether deposit", async () => {
          const balance = await exchange.tokens(ETHER_ADDRESS, user1)
          balance.toString().should.equal(amount.toString())
      })

      it('emits Deposit event', async() => {
        const log = result.logs[0]
        log.event.should.equal("Deposit")
        const event = log.args
        event.token.should.equal(ETHER_ADDRESS, "token address is correct")
        event.user.should.equal(user1, "user address is correct")
        event.amount.toString().should.equal(amount.toString(),"amount is correct")
        event.balance.toString().should.equal(amount.toString(),"balance is correct")
        })
    })

    describe("withdrawing ether", async () => {
        let result
        let amount
  
        beforeEach(async () => {
            //deposit ether first
            amount = ether(1)
            await exchange.depositEther({from: user1, value: amount})
        })

        describe("success", async() =>{
            beforeEach(async () =>{
                //withdraw ether
                result = await exchange.withdrawEther(amount, { from: user1 })
            })
        

        it("tracks the Ether withdraw", async () => {
            const balance = await exchange.tokens(ETHER_ADDRESS, user1)
            balance.toString().should.equal("0")
        })
  
        it('emits ETHER withdraw event', async() => {
          const log = result.logs[0]
          log.event.should.equal("Withdraw")
          const event = log.args
          event.token.should.equal(ETHER_ADDRESS)
          event.user.should.equal(user1)
          event.amount.toString().should.equal(amount.toString())
          event.balance.toString().should.equal("0")
          })
      })

      describe("failure", () => {
        it("rejects insufficient balance", async() => {
            await exchange.withdrawEther(ether(100), {from: user1}).should.be.rejectedWith(EVM_REVERT);
        })
      });
    })

    describe("depositing tokens", () => {
        let result;
        let amount;



        describe("success", () => {

            beforeEach(async () => {
                amount = tokens(10);
                await token.approve(exchange.address, amount, { from: user1 });
                result = await exchange.depositToken(token.address, amount, {from: user1})
            })

            it("tracks the token deposit", async () => {
                let balance;
                balance = await token.balanceOf(exchange.address);
                balance.toString().should.equal(amount.toString());
                balance = await exchange.tokens(token.address, user1);
                balance.toString().should.equal(amount.toString());
            })
            it('emits Deposit event', async() => {
                const log = result.logs[0]
                log.event.should.equal("Deposit")
                const event = log.args
                event.token.should.equal(token.address, "token address is correct")
                event.user.should.equal(user1, "user address is correct")
                event.amount.toString().should.equal(amount.toString(),"amount is correct")
                event.balance.toString().should.equal(amount.toString(),"balance is correct")
                })

        })

        describe("failure", () => {
            it("rejects Ether deposits", async() => {
                //TODO
                await exchange.depositToken(ETHER_ADDRESS, tokens(10), {from: user1}).should.be.rejectedWith(EVM_REVERT);
            })


            it("fails when no tokens are approved", async() => {
                await exchange.depositToken(token.address, tokens(10), {from: user1}).should.be.rejectedWith(EVM_REVERT);
            });
        });
      });

    describe("withdrawing tokens",() => {
        let result;
        let amount;

        describe("success", async () => {
            beforeEach( async () => {
              // depositing token first
                amount = tokens(10);
                await token.approve(exchange.address, amount, { from: user1 })
                await exchange.depositToken(token.address, amount, { from: user1 })
                //withdraw Token
                result = await exchange.withdrawToken(token.address, amount, {from:user1})
            });

            it("tracks the token withdrawn", async () => {
                const balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal("0");
            })

            it('emits token Withdraw event', async() => {
                const log = result.logs[0]
                log.event.should.equal("Withdraw")
                const event = log.args
                event.token.should.equal(token.address)
                event.user.should.equal(user1)
                event.amount.toString().should.equal(amount.toString())
                event.balance.toString().should.equal("0")
                })
        })

        describe("failure", () => {
            it('rejects Ether withdraws', async () => {
                await exchange.withdrawToken(ETHER_ADDRESS, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
              })

            it("rejects insufficient balance", async() => {
                await exchange.withdrawToken(token.address, tokens(10), {from: user1}).should.be.rejectedWith(EVM_REVERT);
            });
        });
    });  

    describe('checking balances', async () => {
        beforeEach(async () => {
          await exchange.depositEther({ from: user1, value: ether(1) }) // always remember to put awaitr for async functions
        })
    
        it('returns user balance', async () => {
          const result = await exchange.balanceOf(ETHER_ADDRESS, user1)
          result.toString().should.equal(ether(1).toString())
        })
      })
    
    describe("making order", async () => {
        let result

        beforeEach(async() => {
            result = await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), {from: user1})
        })

        it("tracks new created order", async () => {
            const orderCount = await exchange.orderCount()
            orderCount.toString().should.equal('1')
            const order = await exchange.orders('1')
            // this next part is to make sure that the attribute of the order struct passed in are correct
            order.id.toString().should.equal('1', 'id is correct')
            order.user.should.equal(user1, 'user is correct')
            order.tokenGet.should.equal(token.address, 'tokenGet is correct')
            order.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
            order.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
            order.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
            order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')

        })

        it('emits Order event', async() => {
            const log = result.logs[0]
            log.event.should.equal("Order")
            const event = log.args
            event.id.toString().should.equal('1', 'id is correct')
            event.user.should.equal(user1, 'user is correct')
            event.tokenGet.should.equal(token.address, 'tokenGet is correct')
            event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
            event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
            event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
            event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
            })
    })

    describe("order actions", async () => {

        beforeEach(async () => {
            //user1 deposits ether to acc
            await exchange.depositEther({from: user1, value: ether(1)})

            //gives tokens to user2
            await token.transfer(user2, tokens(100)), {from: deployer}
            //user2 deposits topken only
            await token.approve(exchange.address, tokens(2), {from: user2})
            await exchange.depositToken(token.address, tokens(2), {from: user2})
            //user1 makes an order to buy tokens with ETH
            await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), {from: user1})
        })

        describe("filling orders", async () => {
            let result

            describe("success", async() => {
                beforeEach(async () => {
                    //user2 fills an order
                    result = await exchange.fillOrder("1", { from: user2})
                })

                it("executes the trade and charges fees", async () => {
                    let balance
                    balance = await exchange.balanceOf(token.address, user1)
                    balance.toString().should.equal(tokens(1).toString(), "user1 received tokens")
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user2)
                    balance.toString().should.equal(ether(1).toString(), "user2 received Ether")
                    balance = await exchange.balanceOf(ETHER_ADDRESS, user1)
                    balance.toString().should.equal("0", "user1 Ether deducted")
                    balance = await exchange.balanceOf(token.address, user2)
                    balance.toString().should.equal(tokens(0.9).toString(), "user2 tokens deducted with fee applied")
                    const feeAccount = await exchange.feeAccount()
                    balance = await exchange.balanceOf(token.address, feeAccount)
                    balance.toString().should.equal(tokens(0.1).toString(), "feeAcount received fee")
                })

                it("updates filled orders", async () =>{
                    const orderFilled = await exchange.orderFilled(1)
                    orderFilled.should.equal(true)
                })

                it("emits a 'trade' event", async() => {
                    const log = result.logs[0]
                    log.event.should.equal("Trade")
                    const event = log.args
                    event.id.toString().should.equal('1', 'id is correct')
                    event.user.should.equal(user1, 'user is correct')
                    event.tokenGet.should.equal(token.address, 'tokenGet is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
                    event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                })
            })
        

        describe("cancelling orders", async () => {
            let result

            describe("success", async ()=> {
                beforeEach(async () => {
                    result = await exchange.cancelOrder("1", {from: user1})
                })

                it("updates cancelled orders", async () => {
                    const orderCancelled = await exchange.orderCancelled(1)
                    orderCancelled.should.equal(true)
                })

                it("emits a 'cancel' event", async ()=> {
                    const log = result.logs[0]
                    log.event.should.equal("Cancelled")
                    const event = log.args
                    event.id.toString().should.equal('1', 'id is correct')
                    event.user.should.equal(user1, 'user is correct')
                    event.tokenGet.should.equal(token.address, 'tokenGet is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
                    event.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
                    })
                })
                
            describe("failure", async() => {
                it("rejects invalid order id", async () => {
                    const invalidOrderId = 1999999999
                    await exchange.cancelOrder(invalidOrderId, {from: user1}).should.be.rejectedWith(EVM_REVERT)
                })

                it("rejects unauthorised cancallations", async() => {
                    await exchange.cancelOrder("1", {from: user2}).should.be.rejectedWith(EVM_REVERT)
                })
            })


            
            })


        })
      })
    })
