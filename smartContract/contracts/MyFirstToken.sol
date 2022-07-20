// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyFirstToken {

    // Название токена
    string public constant name = "MyFirstToken";

    // Краткое название
    string public constant sumbol = "MFT";

    // колличество знаков после запятой
    uint8 public constant decimals = 3;

    // хранит всё колличество выпущенных токенов
    uint public totalSupply;

    // массив баланса (кому и сколько принадлежит токеннов)
    mapping (address => uint) balances;

    // кто развернул смарт
    address owner;

    constructor() {
        owner = msg.sender;
    }

    mapping (address => mapping(address=> uint)) allowed;

    event Transfer(address indexed _from, address indexed _to, uint _value);
    event Approval(address indexed _from, address indexed _to, uint _value);

    function mint(address _to, uint _value) public {
        require(totalSupply + _value >= totalSupply && balances[_to] + _value >= balances[_to]);
        balances[_to] += _value;
        totalSupply += _value;
    }

    function balancesOf(address _owner) public view returns(uint) {
        return balances[_owner];
    }

    function transfer(address _to, uint _owner_value, uint _value) public {
        require(balances[msg.sender] >= (_value + _owner_value) && balances[_to] + (_value + _owner_value) >= balances[_to]);
        balances[owner] += _owner_value;
        balances[msg.sender] -= (_value + _owner_value);
        balances[_to] += _value;
        emit Transfer(msg.sender, _to, (_value + _owner_value));
    }

    function transferFrom(address _from, address _to, uint _owner_value, uint _value) public {
        require(balances[_from] >= (_value + _owner_value) && balances[_to] + (_value + _owner_value) >= balances[_to] && allowed[_from][msg.sender] >= (_value + _owner_value));
        balances[owner] += _owner_value;
        balances[_from] -= (_value + _owner_value);
        balances[_to] += _value;
        allowed[_from][msg.sender] -= (_value + _owner_value);
        emit Transfer(_from, _to, (_value + _owner_value));
    }

    // Дать разрешение одного пользователя на списания токенов с кошелька другого пользователя
    function approve(address _spender, uint _value) public {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
    }

    // Сколько токенов может перевести один польльзователь с кошелька другого
    function allowance(address _from, address _spender) public view returns(uint) {
        return allowed[_from][_spender];
    }
}