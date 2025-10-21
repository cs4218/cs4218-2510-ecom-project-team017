import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useCategory from "../hooks/useCategory";
import Layout from "../components/Layout";
const Categories = () => {
  const categories = useCategory();
  return (
    <Layout title={"All Categories"}>
      <div className="container mt-4">
        <h2 className="text-center mb-4">Browse Categories</h2>
        <div className="row">
          {categories.map((c) => (
            <div className="col-md-4 col-sm-6 mb-4" key={c._id}>
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex align-items-center justify-content-center">
                  <Link to={`/category/${c.slug}`} className="stretched-link text-decoration-none text-dark fw-semibold text-center">
                    {c.name}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Categories;