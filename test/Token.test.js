//jshint esversion:8
import { each } from "lodash";
import { tokens, EVM_REVERT } from "./helpers"

const Token = artifacts.require("./Token");

require("chai").use(require("chai-as-promised")).should();

contract('Token', ([deployer, receiver, exchange]) => { //can add more accounts into the array here. accounts is call back function for this contract. injects all the accoutsn involved . can also break down to different accounts 
  const name = "Curry Puff Token";
  const symbol = "CPT";
  const decimals = "18";
  const totalSupply = tokens(1000000).toString(); //this was refactored. See cosnt tokens above

  let token; // established token as a variable

  beforeEach(async() => {
      token = await Token.new(); // what does.new mean?
  });
  describe("deployment", () => {
    it("tracks the name", async () => {
      const result = await token.name();
      result.should.equal(name);
      });
      // fetch token from BC
      // read token name
      //check name is "my Token"

      it("tracks the symbol", async() => {
        const result = await token.symbol();
        result.should.equal(symbol);
      });

      it("tracks the decimals", async() => {
        const result = await token.decimals();
        result.toString().should.equal(decimals);
      });

      it("tracks the total supply", async () => {
        const result = await token.totalSupply();
        result.toString().should.equal(totalSupply);
      });

      it("assigns total supply to deployer", async() => {
        const result = await token.balanceOf(deployer)
        result.toString().should.equal(totalSupply.toString()) // remmeber to always compare to the same type for chai (eg string to string)
      })

  });

 describe("sending tokens", () =>{
    let amount
    let result

    describe("success", async() => {
    beforeEach(async() => {
      amount = tokens(100)
      result = await token.transfer(receiver, amount, {from: deployer})
    });
 
    it("transfers token balances", async() => {
      let balanceOf //to establish the variable
      //before and after transfer, checking their values
      balanceOf = await token.balanceOf(deployer)
      balanceOf.toString().should.equal(tokens(999900).toString())
      //console.log("deployer balance after transaction", balanceOf.toString())
      balanceOf = await token.balanceOf(receiver)
      balanceOf.toString().should.equal(tokens(100).toString()) // remmeber to compare the same types!
      //console.log("receiver balance before transfer", balanceOf.toString());
    })

    it('emits Transfer event', async() => {
      const log = result.logs[0]
      log.event.should.equal("Transfer")
      const event = log.args
      event.from.should.equal(deployer, "from value is correct")
      event.to.should.equal(receiver, "to is correct") // why is the to not toString()?
      event.value.toString().should.equal(amount.toString(),"value is correct")
      })
    })
    describe("failure", async() => {
      
      it("rejects insufficient balances", async () => {
        let invalidAmount
        invalidAmount = tokens(100000000) // this is greater than total supply.
        await token.transfer(receiver, invalidAmount, {from: deployer}).should.be.rejectedWith(EVM_REVERT);

        invalidAmount = tokens(100)
        await token.transfer(deployer, invalidAmount, {from: receiver}).should.be.rejectedWith(EVM_REVERT);
      })

      it("rejects invalid recepients", async() => {
        await token.transfer(0x0, amount, {from: deployer}).should.be.rejected; // sends to blank address. check what rejected means
      })
      })
  })
  describe("approving tokens", () => {
    let result
    let amount

    beforeEach(async () => {
      amount = tokens(100)
      result = await token.approve(exchange, amount, {from: deployer})
    })

    describe("success", () => {
      it("allocates an allowance for delegated token spending on exchange", async() => {
        const allowance = await token.allowance(deployer, exchange)
        allowance.toString().should.equal(amount.toString())
      })

      it('emits Approval event', async() => {
        const log = result.logs[0]
        log.event.should.equal("Approval")
        const event = log.args
        event.owner.should.equal(deployer, "owner is correct")
        event.spender.should.equal(exchange, "spender is correct") // why is the to not toString()?
        event.value.toString().should.equal(amount.toString(),"value is correct")
      })
    })
  })
  
  describe("delegated token transfers",() => {
    let result
    let amount

    beforeEach(async () => {
      amount = tokens(100)
      await token.approve(exchange, amount, { from: deployer })
    })

    describe("success", async() => {
      beforeEach(async () => {
        result = await token.transferFrom(deployer, receiver, amount, { from:exchange})
      })

      it("transfers token balances", async() => {
        let balanceOf
        balanceOf = await token.balanceOf(deployer)
        balanceOf.toString().should.equal(tokens(999900).toString())
        balanceOf = await token.balanceOf(receiver)
        balanceOf.toString().should.equal(tokens(100).toString())
      })

      it("resets the allowance", async () => {
        const allowance = await token.allowance(deployer, exchange)
        allowance.toString().should.equal("0")
      })

      it("emits a Transfer event", async() => {
        const log = result.logs[0]
        log.event.should.equal('Transfer')
        const event = log.args
        event.from.toString().should.equal(deployer, 'from is correct')
        event.to.should.equal(receiver, 'to is correct')
        event.value.toString().should.equal(amount.toString(), 'value is correct')       
      })
    })

    describe("failure", async() => {
      it("rejects insufficient amounts", async() => {
        const invalidAmount = tokens(1000000000)
        await token.transferFrom(deployer, receiver, invalidAmount, {from: exchange}).should.be.rejectedWith(EVM_REVERT)
      })

      it("rejects invalid recipients", async () => {
        await token.transferFrom(deployer, 0x0, amount, {from:exchange}).should.be.rejected
      })
    })
  })
});
