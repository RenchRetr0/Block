//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./@rarible/royalties/contracts/impl/RoyaltiesV2Impl.sol";
import "./@rarible/royalties/contracts/LibPart.sol";
import "./@rarible/royalties/contracts/LibRoyaltiesV2.sol";

contract MinimalERC721 is ERC721, Ownable, RoyaltiesV2Impl {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;

    string private baseId;
    uint public mint_limit;
    constructor(string memory _baseId, uint _mint_limit) ERC721("Minimal", "MIN") {
        baseId = _baseId;
        mint_limit = _mint_limit;
    }
    struct ownershipStatus {
        uint tokenId;
        bool owns;
    }
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
    mapping(address => ownershipStatus) public ownerToEditionId;
    function mint(address _to) public onlyOwner {
        require(_tokenIdTracker.current() < mint_limit, "Mint limit reached");
        super._mint(_to, _tokenIdTracker.current());
        ownerToEditionId[_to] = ownershipStatus(_tokenIdTracker.current(), true);
        _tokenIdTracker.increment();        
    }

    function ownsId(address _x) public view returns (ownershipStatus memory) {
        return ownerToEditionId[_x];
    }

   function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        ownerToEditionId[from] = ownershipStatus(0, false);
        ownerToEditionId[to] = ownershipStatus(tokenId, true);
        super._transfer(from, to, tokenId);
    }

    function setRoyalties(uint _tokenId, address payable _royaltiesReceipientAddress, uint96 _percentageBasisPoints) public onlyOwner {
        LibPart.Part[] memory _royalties = new LibPart.Part[](1);
        _royalties[0].value = _percentageBasisPoints;
        _royalties[0].account = _royaltiesReceipientAddress;
        _saveRoyalties(_tokenId, _royalties);
    }

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        LibPart.Part[] memory _royalties = royalties[_tokenId];
        if(_royalties.length > 0) {
            return (_royalties[0].account, (_salePrice * _royalties[0].value)/10000);
        }
        return (address(0), 0);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        if(interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES) {
            return true;
        }

        if(interfaceId == _INTERFACE_ID_ERC2981) {
            return true;
        }
        return super.supportsInterface(interfaceId);
    } 
     // TODO: real url need to be here
    function _baseURI() internal view virtual override returns (string memory) {
        return string(abi.encodePacked("https://flahsback.one/ticket/view/", baseId));
    }

}
