package com.company.itasset.repository;

import com.company.itasset.entity.User;
import com.company.itasset.entity.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    Optional<User> findWithBranchById(Long id);

    Page<User> findByRole(Role role, Pageable pageable);

    long countByRole(Role role);

    /** All employees whose direct manager is this user. */
    java.util.List<User> findByManagerId(Long managerId);
}
