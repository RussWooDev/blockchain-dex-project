pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Token.sol";

// [X] Set the fee account
// [X] Deposit Ether
// [X] Withdraw Ether
// [X] Deposit Tokens
// [X] Withdraw Tokens
// [X] Check Balances
// [X] Make Order
// [X] Cancel Order
// [ ] Fill Order
// [ ] Charge Fees

contract Exchange {
    using SafeMath for uint;
    
    //variables
    address public feeAccount; // acc that receives exchange
    uint256 public feePercent;
    address constant ETHER = address(0); // if doesnt have an address, its ether
    //first key is of all those that have been deposited, second is address of the user that deposited the tokens themselves, value is actual number of tokens held by the user
    mapping(address=> mapping(address => uint256)) public tokens;
    mapping(uint256 => _Order) public orders; //type, key, value
    uint256 public orderCount;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;

    // Events
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Order(
        uint id,
        address user,
        address tokenGet,
        uint amountGet, 
        address tokenGive,
        uint amountGive,
        uint timestamp // last one has no","
    );

    event Cancel(
        uint id,
        address user,
        address tokenGet,
        uint amountGet, 
        address tokenGive,
        uint amountGive,
        uint timestamp // last one has no","
    );

    event Trade(
        uint id,
        address user,
        address tokenGet,
        uint amountGet, 
        address tokenGive,
        uint amountGive,
        address userFill,
        uint timestamp // last one has no","
    );

     //STRUCTS

    struct _Order {
        uint id;
        address user; //person who made the address
        address tokenGet; // add of token they want to purchase
        uint amountGet; 
        address tokenGive; // the token they want to trade away
        uint amountGive;
        uint timestamp;
    }


    constructor (address _feeAccount, uint256 _feePercent) public {
        feeAccount = _feeAccount; //_ is a local variable
        feePercent = _feePercent;

    }
    //Fallback: reverts if eth is sent to this contract by mistake
    function() external {
      revert() ; 
    }

    function depositEther() payable public { // need to have payable modifier for it to work
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value); //msg.value is how much ether is getting sent
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    function withdrawEther(uint _amount) public {
        require(tokens[ETHER][msg.sender] >= _amount);
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        msg.sender.transfer(_amount); //sends back the ether to the sender 
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }

    function depositToken(address _token, uint _amount) public { // this would allow any ERC20 token to pass through it as all ERC20 tokens follow a certain standard
        require(_token != ETHER);
        require(Token(_token).transferFrom(msg.sender, address(this), _amount)); // to this smart contract's address
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawToken(address _token, uint _amount) public { // this would allow any ERC20 token to pass through it as all ERC20 tokens follow a certain standard
        require(_token != ETHER);
        require(tokens[_token][msg.sender] >= _amount); // to this smart contract's address
        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
        require(Token(_token).transfer(msg.sender, _amount));
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user) public view returns (uint256) {
        return tokens[_token][_user];
    }

    function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
        orderCount = orderCount.add(1);
        //now is a for timestamp in sol, it gives the time according Epoch Time(expressed in seconds) -> need to convert to human readable
        orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
        emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
    }

    function cancelOrder(uint256 _id) public {
        _Order storage _order = orders[_id]; // fetches order from the mapping. _order is _Order type and fetched from storage specifically
        require(address(_order.user) == msg.sender); // only we can call our own order
        require (_order.id == _id); // confirms that our id exists
        orderCancelled[_id] = true;
        emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, now);
    }

    function fillOrder(uint256 _id) public {
        require(_id> 0 && _id <= orderCount);
        require(!orderFilled[_id]);
        require(!orderCancelled[_id]);

        _Order storage _order = orders[_id]; // fetches order from the mapping. _order is _Order type and fetched from storage specifically
       _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive); 
       orderFilled[_order.id] = true;

    }

    function _trade(uint256 _orderId, address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal {
        //Fee paid by user that fills the order(msg.sender)
        //Fee deducted from _amountGet
        uint _feeAmount = _amountGive.mul(feePercent).div(100);

        //Execute trade (this is the basic approach to trading balances, by swapping the different between tokens)
        //msg.sender is person filling the order and _user is the one who created the order
        tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub(_amountGet.add(_feeAmount));
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);
        tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(_feeAmount); // thats how we collect fees
        tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);
        tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(_amountGive);
        //Charge fees
        //Emit trade event
          emit Trade(_orderId, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, now);

    }

}