// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ForumRollup {
    struct DataPacket {
        uint256 id;
        string cid;          // IPFS 返回的 CID
        bytes32 rootHash;    // 批次数据的 Merkle 根或哈希
        uint256 timestamp;   // 上链时间
        address relayer;     // 打包者的地址
        uint256 operationCount; // 该批次包含的操作数
    }

    uint256 public packetCounter;
    mapping(uint256 => DataPacket) public dataPackets;

    // 事件：方便前端进行监听和索引
    event BatchSubmitted(uint256 indexed packetId, string cid, bytes32 rootHash, address relayer, uint256 operationCount);

    /**
     * @dev 提交批次数据（仅上链极少的数据）
     */
    function submitBatch(string calldata _cid, bytes32 _rootHash, uint256 _operationCount) external {
        require(bytes(_cid).length > 0, "CID cannot be empty");
        require(_operationCount > 0, "Empty batch");

        packetCounter++;
        dataPackets[packetCounter] = DataPacket(
            packetCounter,
            _cid,
            _rootHash,
            block.timestamp,
            msg.sender,
            _operationCount
        );

        emit BatchSubmitted(packetCounter, _cid, _rootHash, msg.sender, _operationCount);
    }

    /**
     * @dev 获取所有已上链的数据包（前端借此去 IPFS 拉取所有帖子）
     */
    function getAllPackets() external view returns (DataPacket[] memory) {
        DataPacket[] memory packets = new DataPacket[](packetCounter);
        for (uint256 i = 1; i <= packetCounter; i++) {
            packets[i - 1] = dataPackets[i];
        }
        return packets;
    }
}