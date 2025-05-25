// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FileRegistry {
    struct File {
        string filename;
        string filehash;
        address uploader;
    }

    File[] public files;

    // index => wallet => permission
    mapping(uint => mapping(address => bool)) public downloadPermissions;

    event FileUploaded(string filename, string filehash, address uploader);
    event PermissionGranted(uint index, address grantee);

    function uploadFile(string memory _filename, string memory _filehash) public {
        files.push(File(_filename, _filehash, msg.sender));
        emit FileUploaded(_filename, _filehash, msg.sender);
    }

    function getFile(uint index) public view returns (string memory, string memory, address) {
        require(index < files.length, "Index out of bounds");
        File memory file = files[index];
        return (file.filename, file.filehash, file.uploader);
    }

    function getTotalFiles() public view returns (uint) {
        return files.length;
    }

    function grantDownloadPermission(uint index, address grantee) public {
        require(index < files.length, "Invalid index");
        require(msg.sender == files[index].uploader, "Only uploader can grant access");
        downloadPermissions[index][grantee] = true;
        emit PermissionGranted(index, grantee);
    }

    function canDownload(uint index, address user) public view returns (bool) {
        if (index >= files.length) return false;
        return user == files[index].uploader || downloadPermissions[index][user];
    }
}
