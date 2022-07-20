import { ethers} from "hardhat";
import { expect } from "chai";

import {MinimalERC721__factory, MinimalERC721} from '../../typechain'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Wallet } from "ethers";
import exp from "constants";

describe("MinimalErc721", function () {
  let token: MinimalERC721;
  let signer: SignerWithAddress;
  beforeEach(async function () {
    [signer] = await ethers.getSigners();
    const minimalFactory = (await ethers.getContractFactory("MinimalERC721")) as MinimalERC721__factory; 
    token = await minimalFactory.deploy('1337', 5);
    await token.deployed();
  });

  it("Deploys and mints", async function () {
    expect((await token.name()) == 'Minimal');
    await token.mint(signer.address);

    expect((await token.balanceOf(signer.address)).toString() == '1');
  });

  it("Sets royalties and gets correct data via RaribleV2", async function () {
    await token.mint(signer.address);
    // 1000 - 10%
    await token.setRoyalties(0, signer.address, 1000);

    const raribleRoyalties = await token.getRaribleV2Royalties(0);

    expect(raribleRoyalties[0].account == signer.address);
    expect(raribleRoyalties[0].value.eq(1000));
  });

  it("Sets royalties and gets correct data via ERC2981", async function () {
    await token.mint(signer.address);
    // 1000 - 10%
    await token.setRoyalties(0, signer.address, 1000);
    const sellPrice = 10000;
    const raribleRoyalties = await token.royaltyInfo(0, sellPrice);

    expect(raribleRoyalties.receiver == signer.address);
    expect(raribleRoyalties.royaltyAmount.eq(sellPrice * .10));
  });
  it("Transfers token", async function () {
    await token.mint(signer.address);

    const wallet = Wallet.createRandom();
    let owns = await token.ownsId(signer.address);
    expect(owns.owns);
    expect(owns.tokenId.eq(0));
    
    token.transferFrom(signer.address, wallet.address, owns.tokenId);
    const senderBalance = await token.balanceOf(signer.address);
    const recipientBalance = await token.balanceOf(wallet.address);

    expect(senderBalance.eq(0))
    expect(recipientBalance.eq(1))

    owns = await token.ownsId(wallet.address);
    expect(owns.owns);
    expect(owns.tokenId.eq(0));

    owns = await token.ownsId(signer.address);
    expect(!owns.owns);
    expect(owns.tokenId.eq(0));
  })
});